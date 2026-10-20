'use strict';

const API = 'https://openlibrary.org';
const PAGE_SIZE = 10;
const MAX_RESULTS = 60;
// Only IDs are stored here. Titles and covers are retrieved from the Works API.
const bookshelfIds = ['OL45804W', 'OL66554W', 'OL262463W', 'OL18417W'];
const statusBox = document.querySelector('#status');

function setStatus(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', error);
}

function workId(key) {
  const id = typeof key === 'string' ? key.replace(/^\/works\//, '') : '';
  return /^OL\d+W$/.test(id) ? id : null;
}

async function getJSON(url, signal) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 25000);
  try {
    const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
    const response = await fetch(url, { signal: combined });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (timeout.signal.aborted && !signal?.aborted) throw new Error('Request timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function createCover(coverId, title, size = 'S') {
  const box = element('div', undefined, 'cover');
  const fallback = () => box.replaceChildren(element('span', 'Cover unavailable', 'placeholder'));
  if (!Number.isInteger(coverId) || coverId <= 0) {
    fallback();
    return box;
  }
  const image = document.createElement('img');
  image.alt = `Cover of ${title}`;
  image.loading = 'lazy';
  image.addEventListener('error', fallback, { once: true });
  // default=false returns an error instead of an invisible 1-pixel image.
  image.src = `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
  box.append(image);
  return box;
}

function createCard(book, id, coverId) {
  const title = book.title || 'Untitled book';
  const card = element('article', undefined, 'card');
  const heading = element('h3');
  if (id) {
    const link = element('a', title);
    link.href = `book.html?work=${encodeURIComponent(id)}`;
    heading.append(link);
  } else {
    heading.textContent = `${title} (details unavailable)`;
  }
  card.append(createCover(coverId, title), heading);
  return card;
}

function firstCover(book) {
  return Array.isArray(book.covers) ? book.covers.find(id => Number.isInteger(id) && id > 0) : undefined;
}

function descriptionText(description) {
  if (typeof description === 'string') return description.trim() || 'No description available.';
  if (description && typeof description.value === 'string') return description.value.trim() || 'No description available.';
  return 'No description available.';
}

function initSearch() {
  const form = document.querySelector('#search-form');
  const input = document.querySelector('#query');
  const results = document.querySelector('#results');
  const pagination = document.querySelector('#pagination');
  const selector = document.querySelector('#page');
  let searchTerm = '';
  let controller;
  let requestNumber = 0;

  async function search(page) {
    // Cancel earlier requests so a slower response cannot replace a newer search.
    controller?.abort();
    controller = new AbortController();
    const currentRequest = ++requestNumber;
    results.replaceChildren();
    pagination.hidden = true;
    setStatus('Searching Open Library…');
    const parameters = new URLSearchParams({ q: searchTerm, limit: PAGE_SIZE, page, fields: 'key,title,cover_i' });
    history.replaceState(null, '', `?${new URLSearchParams({ q: searchTerm, page })}`);
    try {
      const data = await getJSON(`${API}/search.json?${parameters}`, controller.signal);
      if (currentRequest !== requestNumber) return;
      if (!Array.isArray(data.docs)) throw new Error('Search response has no docs array.');
      const count = Math.max(0, Number(data.numFound ?? data.num_found) || 0);
      const total = Math.min(count, MAX_RESULTS);
      const pageCount = Math.ceil(total / PAGE_SIZE);
      if (page > pageCount && pageCount > 0) return search(1);
      const docs = data.docs.slice(0, Math.min(PAGE_SIZE, MAX_RESULTS - (page - 1) * PAGE_SIZE));
      // The docs array contains the current page of search results.
      for (const book of docs) results.append(createCard(book, workId(book.key), book.cover_i));
      selector.replaceChildren();
      for (let number = 1; number <= pageCount; number++) {
        const option = element('option', `${number} of ${pageCount}`);
        option.value = number;
        selector.append(option);
      }
      selector.value = String(page);
      pagination.hidden = pageCount <= 1;
      if (!docs.length) setStatus(`No books found for “${searchTerm}”. Try another title, author, or topic.`);
      else setStatus(`Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + docs.length} of ${total} books for “${searchTerm}”.${count > MAX_RESULTS ? ' Results limited to the first 60.' : ''}`);
    } catch (error) {
      if (error.name !== 'AbortError' && currentRequest === requestNumber) setStatus('Books could not be loaded. Check your connection and try the search again.', true);
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    searchTerm = input.value.trim();
    if (!searchTerm) {
      controller?.abort();
      requestNumber++;
      results.replaceChildren();
      pagination.hidden = true;
      history.replaceState(null, '', location.pathname);
      setStatus('Please enter a title, author, or topic to search.');
      input.focus();
      return;
    }
    search(1);
  });
  selector.addEventListener('change', () => search(Number(selector.value)));
  const params = new URLSearchParams(location.search);
  if (params.get('q')?.trim()) {
    searchTerm = params.get('q').trim().slice(0, 200);
    input.value = searchTerm;
    const requestedPage = Number(params.get('page'));
    search(Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= MAX_RESULTS / PAGE_SIZE ? requestedPage : 1);
  }
}

async function initDetails() {
  const id = workId(new URLSearchParams(location.search).get('work'));
  if (!id) return setStatus('No valid book was selected. Choose a book from Home or My Bookshelf.', true);
  try {
    const book = await getJSON(`${API}/works/${id}.json`);
    const details = document.querySelector('#details');
    const information = element('div');
    information.append(element('h2', book.title || 'Untitled book'), element('p', `Work ID: ${id}`, 'work-id'), element('h3', 'About this book'), element('p', descriptionText(book.description), 'description'), element('h3', 'Subjects'));
    const subjects = Array.isArray(book.subjects) ? book.subjects.filter(s => typeof s === 'string').slice(0, 10) : [];
    if (subjects.length) {
      const list = element('ul', undefined, 'subjects');
      for (const subject of subjects) list.append(element('li', subject));
      information.append(list);
    } else information.append(element('p', 'No subjects available.'));
    const link = element('a', 'View this book on Open Library ↗', 'external');
    link.href = `${API}/works/${id}`;
    information.append(link);
    details.replaceChildren(createCover(firstCover(book), book.title || 'Untitled book', 'M'), information);
    details.hidden = false;
    setStatus('Book information from Open Library.');
  } catch {
    setStatus('This book could not be loaded. Try again, or select another book from Home or My Bookshelf.', true);
  }
}

async function initShelf() {
  const results = document.querySelector('#results');
  let loaded = 0;
  // Sequential requests avoid sending a burst of Works API calls.
  for (const id of bookshelfIds) {
    try {
      const book = await getJSON(`${API}/works/${id}.json`);
      results.append(createCard(book, id, firstCover(book)));
      loaded++;
    } catch {
      const card = element('article', undefined, 'card');
      card.append(element('h3', 'Book temporarily unavailable'), element('p', `Work ID: ${id}`));
      results.append(card);
    }
  }
  setStatus(loaded === bookshelfIds.length ? `${loaded} books on my bookshelf. Select a title to learn more.` : `${loaded} of ${bookshelfIds.length} books loaded. Refresh the page to retry unavailable books.`, loaded !== bookshelfIds.length);
}

const page = document.body.dataset.page;
if (page === 'search') initSearch();
if (page === 'details') initDetails();
if (page === 'shelf') initShelf();
