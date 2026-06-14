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
