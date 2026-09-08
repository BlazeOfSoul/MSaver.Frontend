# MSaver

Angular frontend for MSaver, a personal finance app for accounts, categories, tags,
transactions, transfers, and analytics.

## Stack

- Angular 21
- Vitest via Angular test runner
- Chart.js
- Tailwind CSS v4 tokens in `src/styles.css`

## Development

Start the backend from the `MSaver` repository, then run the frontend:

```bash
dotnet run --launch-profile http
npm start
```

Open `http://localhost:4200`. Local API calls use `proxy.conf.json` and are
forwarded from `/api` to `http://127.0.0.1:5200`.

## Scripts

```bash
npm start                  # dev server with API proxy
npm test                   # unit tests
npm run build              # production build
npm run test:style-budgets # component CSS budget check
```

## PWA updates

Production builds generate a versioned `ngsw.json` manifest. The application checks
for updates after startup, when it becomes visible or reconnects, and hourly while
open. Once a version is downloaded, the update banner lets the user save their work
before reloading. Reload is disabled while HTTP requests are pending. This follows
[Angular's service-worker update lifecycle](https://angular.dev/ecosystem/service-workers/communications).

An installed version predating the banner receives this release through the
existing service worker on a normal reopen/reload; a further reload may be needed
after the download completes. Offline or closed installations update when they
next connect. Updating does not clear storage or push subscriptions.

The frontend deployment workflow verifies tests, layout, style budgets and the
production build before replacing only the frontend container. Backend changes
are released separately.
