# Individual Project Milestone 3: Open Library Single Page Application
Shemar Glanville · IT 4403

## Files
- index.html: the only main application page.
- styles.css: separate Milestone 3 stylesheet based on The Reading Room design.
- app.js: jQuery AJAX requests, pagination, details, subject collection, and state handling.
- vendor/jquery-3.7.1.min.js: local jQuery dependency (includes its license notice).

Milestone 2 is unchanged. The updated repository-root projects.html links to milestone3/index.html.

## Run
From the repository root run `python3 -m http.server 8000`, then open http://localhost:8000/milestone3/index.html. Open Library data and covers require an internet connection.

## Implementation
Search retrieves up to 50 records once and displays 10 per view. Pagination changes the result list locally, preserving the submitted query. A new search resets to page 1. Each selected book loads a Work record through jQuery AJAX; the details section is shared by search and collection items. Search results, the page number, and the collection are preserved while details load.

The fantasy collection uses /subjects/fantasy.json?limit=10 rather than a manually selected ID list. Author names are reused from search or collection data; author records are requested only when needed. Work and author responses are cached. Requests are serialized and spaced at least 1.1 seconds apart. Search submissions are disabled while pending, and selection tokens prevent older detail responses from replacing a newer selection.

API content is inserted as text. Missing authors, descriptions, subjects and covers have fallbacks. Image errors replace the broken image. Descriptions support both text and {value: ...}. Failed collection loads have a Retry button; search and detail requests can be retried by repeating the action.

## GitHub upload
1. Extract the package.
2. Upload the milestone3 folder and updated projects.html to the root of sglanvil-jam/IT4403. Keep the folder structure, including vendor.
3. Commit the changes. Do not replace milestone2.
4. Keep the repository public through 10 days after the submission deadline.

## Azure Static Web Apps
Use an Azure Static Web App connected to this GitHub repository. For this buildless course site:
- Branch: main
- Build preset: Custom
- App location: / (repository root)
- API location: leave empty
- Output location: leave empty
- No frontend build command is required.

Deploy the whole course repository so the existing homepage and projects.html remain available. Open the Azure-provided hostname with /milestone3/index.html appended. Confirm the GitHub Actions deployment succeeds. GitHub Pages alone does not satisfy the Azure requirement. Existing Azure configuration may use different settings; preserve the configuration if it already deploys the repository correctly.

## Verification completed during preparation
- node --check milestone3/app.js passed.
- Live Open Library search and fantasy subject endpoints returned successful JSON responses with the expected fields.
- Git diff confirmed there are no changes under milestone2.
- Interactive browser verification could not run because the preview returned an access-layer bearer-token error. The following checks remain to be run on the live Azure application.

## Browser checklist and report screenshots
1. Submit an empty or whitespace-only query: a validation message appears and there is no page reload.
2. Search for `tolkien`: up to 50 results appear, 10 on the first view, with Page 1 of 5 when 50 records are returned.
3. Select page 2 and page 5: the indicator updates and the submitted query remains the same. Capture a readable screenshot showing results and pagination.
4. Select a result from page 2: title, Work ID, author names, description, subjects (maximum 10), cover and Open Library link appear in the details section. Page 2 and the search results remain available. Capture the details.
5. Submit another search: pagination resets to page 1. A query with fewer than 50 results produces only the necessary pages and a partial last page where applicable.
6. Search for a deliberately nonexistent phrase: a no-results message appears.
7. Select a fantasy collection title: it uses the same details section. Capture the labeled collection. Searching must not replace the collection.
8. Find a record missing a description or cover and capture its fallback message. Covers and data vary over time.
9. Use browser developer tools Offline mode, then search: a failure message appears and the Search button becomes available again. Restore the network and retry. Failed requests time out after 20 seconds once started.
10. Check keyboard navigation, a narrow phone viewport, and the Open Library link opening in a new tab.

## PDF report (after Azure deployment)
First page: Shemar Glanville; assignment title; the actual direct Azure application URL; and https://github.com/sglanvil-jam/IT4403 .
Include clearly labeled readable screenshots with brief explanations for search, pagination and the current-page indicator, selected-book details, fantasy collection, and validation/missing-data/error handling. Do not submit placeholder URLs or claim unperformed tests. Capture screenshots on the deployed Azure application before completing the final PDF.

## References
https://openlibrary.org/dev/docs/api/search
https://openlibrary.org/dev/docs/api/subjects
https://openlibrary.org/dev/docs/api/covers
https://openlibrary.org/developers/api
https://jquery.com/
