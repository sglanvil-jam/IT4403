'use strict';

if (!window.jQuery) {
  document.querySelector('#search-status').textContent = 'The application could not start. Reload the page to try again.';
  document.querySelector('#collection-status').textContent = 'Collection unavailable while the application is offline.';
  document.querySelector('#search-button').disabled = true;
} else {
  jQuery(function ($) {
    const API = 'https://openlibrary.org';
    const PAGE_SIZE = 10;
    const MAX_RESULTS = 50;
    const state = { books: [], term: '', page: 1, searching: false, selection: 0 };
    const detailsCache = new Map();
    const authorCache = new Map();
    let requestQueue = Promise.resolve();
    let lastRequest = 0;

    // Serialize API requests and space their start times to avoid bursts.
    function getJSON(path, data) {
      const request = requestQueue.then(async function () {
        const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        lastRequest = Date.now();
        return new Promise(function (resolve, reject) {
          $.ajax({ url: API + path, data, dataType: 'json', timeout: 20000 })
            .done(resolve).fail(function (xhr, status) { reject(new Error(status)); });
        });
      });
      requestQueue = request.catch(function () {});
      return request;
    }

    function message(selector, text, error = false) {
      $(selector).text(text).toggleClass('error', error);
    }

    function workId(key) {
      const id = typeof key === 'string' ? key.replace(/^\/works\//, '') : '';
      return /^OL\d+W$/.test(id) ? id : null;
    }

    function strings(values) {
      return Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
    }

    function firstCover(book) {
      return Array.isArray(book.covers) ? book.covers.find(id => Number.isInteger(id) && id > 0) : null;
    }

    function descriptionText(description) {
      const text = typeof description === 'string' ? description : description?.value;
      return typeof text === 'string' && text.trim() ? text.trim() : 'No description available.';
    }

    function cover(id, title, size = 'S') {
      const box = $('<div>').addClass('cover');
      const fallback = () => box.empty().append($('<span>').addClass('placeholder').text('Cover unavailable'));
      if (!Number.isInteger(id) || id <= 0) fallback();
      else {
        $('<img>').attr({ alt: 'Cover of ' + title, loading: 'lazy' })
          .one('error', fallback)
          .attr('src', 'https://covers.openlibrary.org/b/id/' + id + '-' + size + '.jpg?default=false')
          .appendTo(box);
      }
      return box;
    }

    // One renderer keeps search results and the subject collection consistent.
    // API strings are always inserted as text rather than HTML.
    function card(book) {
      const title = book.title || 'Untitled book';
      const id = workId(book.key);
      const heading = $('<h3>');
      if (id) {
        $('<button>').attr('type', 'button').addClass('book-button').text(title)
          .on('click', function () { selectBook(book); }).appendTo(heading);
      } else heading.text(title + ' (details unavailable)');
      return $('<article>').addClass('card').append(cover(book.cover_i ?? book.cover_id, title), heading);
    }

    function renderPage(page) {
      state.page = page;
      const pages = Math.ceil(state.books.length / PAGE_SIZE);
      const start = (page - 1) * PAGE_SIZE;
      const books = state.books.slice(start, start + PAGE_SIZE);
      $('#results').empty().append(books.map(card));
      const pagination = $('#pagination').empty().prop('hidden', !pages);
      if (!books.length) {
        message('#search-status', 'No books found for “' + state.term + '”. Try another title or keyword.');
        return;
      }
      message('#search-status', 'Showing ' + (start + 1) + '–' + (start + books.length) + ' of ' + state.books.length + ' available results for “' + state.term + '”.');
      $('<span>').text('Page ' + page + ' of ' + pages).attr('role', 'status').appendTo(pagination);
      for (let number = 1; number <= pages; number++) {
        const button = $('<button>').attr({ type: 'button', 'aria-label': 'Page ' + number }).text(number);
        if (number === page) button.attr('aria-current', 'page');
        button.on('click', function () {
          renderPage(number);
          $('#pagination button').eq(number - 1).trigger('focus');
        }).appendTo(pagination);
      }
    }

    $('#search-form').on('submit', async function (event) {
      event.preventDefault();
      if (state.searching) return;
      const term = $('#query').val().trim();
      if (!term || term.length > 200) {
        message('#search-status', 'Please enter a title or keywords (up to 200 characters).', true);
        $('#query').trigger('focus');
        return;
      }
      state.searching = true;
      state.term = term;
      state.books = [];
      state.page = 1;
      $('#search-button').prop('disabled', true).text('Searching…');
      $('#results').empty().attr('aria-busy', 'true');
      $('#pagination').empty().prop('hidden', true);
      message('#search-status', 'Searching Open Library…');
      try {
        const data = await getJSON('/search.json', { q: term, limit: MAX_RESULTS, fields: 'key,title,author_name,cover_i' });
        if (!Array.isArray(data.docs)) throw new Error('Invalid search response');
        state.books = data.docs.slice(0, MAX_RESULTS);
        renderPage(1);
      } catch {
        message('#search-status', 'Books could not be loaded. Check your connection and try the search again.', true);
      } finally {
        state.searching = false;
        $('#search-button').prop('disabled', false).text('Search books');
        $('#results').attr('aria-busy', 'false');
      }
    });

    async function authorNames(work, source, selection) {
      const supplied = strings(source.author_name);
      if (supplied.length) return supplied;
      const collectionNames = Array.isArray(source.authors) ? strings(source.authors.map(author => author?.name)) : [];
      if (collectionNames.length) return collectionNames;
      const names = [];
      const refs = Array.isArray(work.authors) ? work.authors : [];
      for (const ref of refs) {
        if (selection !== state.selection) break;
        const key = ref?.author?.key;
        if (!/^\/authors\/OL\d+A$/.test(key || '')) continue;
        try {
          if (!authorCache.has(key)) authorCache.set(key, await getJSON(key + '.json'));
          const name = authorCache.get(key)?.name;
          if (typeof name === 'string' && name.trim()) names.push(name);
        } catch { /* An unavailable author record must not hide the book details. */ }
      }
      return names;
    }

    async function selectBook(source) {
      const id = workId(source.key);
      if (!id) return;
      const selection = ++state.selection;
      $('#details').empty().attr('aria-busy', 'true');
      message('#details-status', 'Loading book details…');
      document.querySelector('#details-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        let work = detailsCache.get(id);
        if (!work) {
          work = await getJSON('/works/' + id + '.json');
          if (!work || typeof work !== 'object' || Array.isArray(work) || work.error) throw new Error('Invalid work response');
          detailsCache.set(id, work);
        }
        if (selection !== state.selection) return;
        const names = await authorNames(work, source, selection);
        if (selection !== state.selection) return;
        const title = work.title || source.title || 'Untitled book';
        const info = $('<div>').append(
          $('<h2>').text(title),
          $('<p>').addClass('work-id').text('Work ID: ' + id),
          $('<p>').text('Authors: ' + (names.length ? names.join(', ') : 'Author information unavailable.')),
          $('<h3>').text('About this book'),
          $('<p>').addClass('description').text(descriptionText(work.description)),
          $('<h3>').text('Subjects')
        );
        const subjects = strings(work.subjects).slice(0, 10);
        if (subjects.length) info.append($('<ul>').addClass('subjects').append(subjects.map(subject => $('<li>').text(subject))));
        else info.append($('<p>').text('No subjects available.'));
        info.append($('<a>').addClass('external').attr({ href: API + '/works/' + id, target: '_blank', rel: 'noopener noreferrer' }).text('View this book on Open Library ↗'));
        $('#details').empty().append(cover(firstCover(work) ?? source.cover_i ?? source.cover_id, title, 'M'), info);
        message('#details-status', 'Book information from Open Library.');
      } catch {
        if (selection === state.selection) message('#details-status', 'This book could not be loaded. Select its title again to retry, or choose another book.', true);
      } finally {
        if (selection === state.selection) $('#details').attr('aria-busy', 'false');
      }
    }

    async function loadCollection() {
      $('#collection-retry').prop('hidden', true).prop('disabled', true);
      $('#collection').empty().attr('aria-busy', 'true');
      message('#collection-status', 'Loading the fantasy collection…');
      try {
        const data = await getJSON('/subjects/fantasy.json', { limit: 10 });
        if (!Array.isArray(data.works)) throw new Error('Invalid subject response');
        const books = data.works.slice(0, 10);
        $('#collection').append(books.map(card));
        message('#collection-status', books.length ? books.length + ' fantasy books. Select a title to explore its details.' : 'The fantasy collection is currently empty. Try again later.');
        $('#collection-retry').prop('hidden', !!books.length);
      } catch {
        message('#collection-status', 'The fantasy collection could not be loaded. You can still search for books or retry the collection.', true);
        $('#collection-retry').prop('hidden', false);
      } finally {
        $('#collection').attr('aria-busy', 'false');
        $('#collection-retry').prop('disabled', false);
      }
    }
    $('#collection-retry').on('click', loadCollection);
    loadCollection();
  });
}
