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

## Release 0.1.0

See [release notes and validation](docs/release-0.1.0.md) for frontend, backend and
nginx changes, compatibility, test results and deployment order.

The dashboard shows its journal before the full history, balances and rates finish
loading. Additional sections load separate JavaScript chunks. Once complete, one
dashboard snapshot is cached for the authenticated user and current query, for up
to 12 hours and 2 million serialized characters. A saved-data notice distinguishes
it from a live response. Mutations, logout and switching users invalidate it.
Tokens are not stored in this cache. Cold offline authentication still requires a
server connection; this is a read cache, not an offline editing queue.

## Isolated API integration checks

`node scripts/qa-api-integration.mjs` creates disposable users, accounts and
transactions spanning December 2025 through October 2026, then verifies 16 API
scenarios. It only targets `http://127.0.0.1:4303` and writes results and local test
credentials to ignored `.tmp/qa-*.json` files. Run it from the frontend root.

Start the matching backend on that port with an explicit connection string to a
separate disposable PostgreSQL database and local JWT settings. Its migrations
must be applied. Point `ExchangeRateApi__BaseUrl` and `ExchangeRateApi__ApiKey` to
a local fixture provider returning USD-based rates USD=1, EUR=0.92, BYN=3.2, RUB=90,
PLN=4, GBP=0.8, CNY=7, a current `time_last_update_unix` and a next-day
`time_next_update_unix`. Do not run this data-generating script against a backend
connected to production. The ordinary unit suite needs neither Docker nor this API.
