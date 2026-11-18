# Genuine Article Counter Setup

This static GitHub Pages site does not currently include likes or shared view counts.

A shared visitor counter is not available until a persistent backend is configured. It cannot be implemented safely with browser local storage because local storage is not shared across visitors. It also cannot use GitHub Pages alone for writes.

The clean integration path is a small serverless counter endpoint that provides:

- `GET /articles/{slug}/stats` for current views and likes.
- `POST /articles/{slug}/view` for one session-level view increment.
- `POST /articles/{slug}/like` for an authenticated or abuse-resistant like action.

The endpoint must provide CORS configuration, abuse controls, deduplication, and no public write credentials. The browser must only receive a public endpoint URL. Article JavaScript can then call this endpoint and gracefully retain the sharing experience if it is unavailable.

Suitable providers can be configured later, but no provider or unconfigured third-party service is enabled in this repository.
