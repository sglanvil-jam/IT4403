# Individual Project Milestone 2

Shemar Glanville — IT 4403

Standalone book explorer using HTML, CSS, and plain JavaScript. No frameworks, external libraries, API keys, or build tools are needed.

## Files
- index.html: live search and pagination (10 results per page, maximum 60).
- book.html: work details; accepts ?work=OL45804W.
- bookshelf.html: four API-loaded books selected by Work ID.
- styles.css: stylesheet dedicated to Milestone 2.
- app.js: requests, rendering, fallbacks, and page logic.

## Run locally
From the repository root: `python3 -m http.server 8000`
Then visit http://localhost:8000/milestone2/ . Internet access is required for Open Library data and covers.

## Upload
1. Extract the ZIP on your computer. Do not upload the ZIP itself to GitHub.
2. Open https://github.com/sglanvil-jam/IT4403 and choose Add file → Upload files.
3. Upload the milestone2 folder (keep that folder name) and the updated projects.html to the repository root. projects.html adds the Milestone 2 link to the existing Projects page.
4. Commit the files and allow GitHub Pages to finish deployment.
5. Open https://sglanvil-jam.github.io/IT4403/milestone2/index.html and check search, pagination, book details, bookshelf, and cover images.
6. The PDF report includes local screenshots and a deployment note. After publishing, replace that note and capture the public pages if required. Review the troubleshooting draft to ensure it matches your own experience before submission.

## API references
https://openlibrary.org/dev/docs/api/search
https://openlibrary.org/dev/docs/api/covers
https://openlibrary.org/dev/docs/api/restful_api

The application handles both bare Work IDs and /works/ keys, both description formats, missing covers, empty input, no matches, invalid IDs, request failures, and timeouts. The API data is inserted with textContent, and earlier searches are canceled to prevent stale results.
