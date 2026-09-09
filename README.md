# SEC filings

TypeScript, React, Express, Zod, and Vitest. SEC history retrieval, paginated filings, and multi-company summaries are
implemented. The interactive UI is next; see [ROADMAP.md](ROADMAP.md).

## Install

Tested with **Bun 1.4.2** and **Node 22.22.2**. Bun runs the backend and package scripts; Node runs Vite, Vitest, and
knip.

Install Bun on macOS/Linux using the [official installer](https://bun.com/docs/installation):

```sh
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.2"
```

Open a new terminal afterward. With [nvm](https://github.com/nvm-sh/nvm) installed, run these from the repository root;
otherwise install Node 22.22.2 directly:

```sh
nvm install
nvm use
bun --version
node --version
bun install --frozen-lockfile
cp .env.example .env
```

Edit `.env`: replace `SEC_USER_AGENT` with your name and contact email (for example, `Jane Doe jane@example.com`).
`PORT` defaults to `3000` and must be an integer from 1 to 65535. Bun loads `.env` automatically; it is ignored by Git.
No SEC API key is needed. The adapter uses this identity for SEC requests; the current placeholder UI does not fetch data.

## Run

```sh
bun run dev
```

Open http://127.0.0.1:5173. Vite proxies `/health`, `/companies`, and `/filings` to Express on `PORT`. Ctrl-C stops both
processes. If ports are occupied, set `PORT` and/or `CLIENT_PORT` to different free ports in `.env`; the defaults are
3000 and 5173.

For the production build, stop development first:

```sh
bun run build
bun run start
```

Open http://127.0.0.1:3000 (or your configured port). Express serves the built React page and API together, bound to the
local machine. `GET /health` returns `{"status":"ok"}`; unknown routes return a JSON 404. Missing/invalid configuration
and occupied ports stop startup with an error.

CORS allows `http://127.0.0.1:<PORT>` and, in development, `http://127.0.0.1:<CLIENT_PORT>` (defaults 3000/5173).
It permits GET/HEAD and Accept, without credentials. Other origins return 403; requests without Origin remain supported.
Use the documented `127.0.0.1` URLs; `localhost` is a different origin. Production does not allow the development origin.

## Check

```sh
bun run typecheck
bun run check
bun run check:unused
bun run test
```

`bun run test:unit` runs filing normalization, filtering/pagination, summary aggregation, and React tests.
`bun run test:integration` exercises the SEC adapter and real Express requests with SEC traffic stubbed; injected client
defects verify the generic HTTP error contract. Tests use Vitest, require permission to open local ports, and never call
live APIs. Manual live acceptance is separate from automated tests and CI. Use
`bun run test`, since `bun test` invokes Bun's different test runner. `bun run format` applies Biome's safe
formatting/import fixes.

Before handoff, also build/start and check the page in a browser plus `curl -fsS http://127.0.0.1:3000/health`.
Validation evidence and edge cases are in [NOTES.md](NOTES.md); AI prompts are in [PROMPTS.md](PROMPTS.md).

[GitHub CI](.github/workflows/ci.yml) runs type, formatting/lint, unused-code, unit/React, integration, and production-build
checks on every PR and push to `main`. It uses the versions in `.nvmrc` and `package.json`, a frozen lockfile, and no
project secrets or live SEC data. New commits cancel older runs for the same PR or branch.

## Filings API

After starting the server, these requests use your configured SEC identity (adjust the port if needed):

```sh
curl -fsS 'http://127.0.0.1:3000/companies/AAPL/filings'
curl -fsS 'http://127.0.0.1:3000/companies/AAPL/filings?form=10-K&page=1&pageSize=25&sort=asc'
```

`GET /companies/:ticker/filings` returns `{ company, filings, page, pageSize, total }`. Company fields are `ticker`, `cik`,
and `name`; each filing contains `accessionNumber`, `form`, `filingDate`, and `documentUrl`. `total` counts all matches
before pagination. No matches or a page beyond the end returns an empty `filings` array.

| Query | Default / behavior |
| --- | --- |
| `page` | `1`; positive safe integer written with decimal digits. |
| `pageSize` | `25`; positive integer, maximum `100`. |
| `form` | Optional exact, case-sensitive match after trimming. `10-K/A` and `20-F` remain distinct from `10-K`. |
| `sort` | `desc` (newest first), or `asc`. Filing date and then accession number use that direction. |

Filtering and sorting apply to complete history before pagination. Unknown, nested, repeated, empty, or invalid query
parameters return 400. Errors use `{ "error": { "code": "…", "message": "…" } }`: 400 for invalid input, 404 for an unmapped
ticker, 502 for SEC rejection/data failures, and 504 for SEC timeouts. Unexpected internal failures return a generic 500.
Pagination limits the response size; a cold lookup still fetches every required archive.

Requests are body-free: a positive Content-Length or any Transfer-Encoding returns 413. Encoded URL paths/queries over
4096 bytes return 414. Helmet protects Express responses, including the built page. Local HTTP does not enable HSTS or
automatic HTTPS upgrading. Inbound rate limiting and request logging are not implemented; see
[security practices and remaining gaps](NOTES.md#security-practices-and-remaining-gaps) before considering public hosting.

`src/server/filings/` contains the router, controller, pure listing logic, query schemas, response types, and business tests.
`src/server/errors/` translates API errors; startup creates one shared SEC client and injects it into the application.
Routers register paths; controllers validate input, call services, and send responses. Business services have no Express
dependency. HTTP integration tests exercise these boundaries through the application.

## Summary API

```sh
curl -fsS 'http://127.0.0.1:3000/filings/summary?tickers=AAPL,SPOT,JPM'
```

`GET /filings/summary` requires one comma-separated `tickers` parameter. Trim/uppercase and deduplication preserve
first-requested order; the limit is 10 unique tickers. Empty entries, repeated parameters, unknown query keys, or more
than 10 unique tickers return 400 before SEC work.

The response is `{ window: { from, to }, results }`. Dates are UTC `YYYY-MM-DD`; `from` is 12 calendar months before
today, with leap day clamped to February 28 where necessary. Both bounds are inclusive and captured once per request.

- Success: `{ ticker, status: "success", company, countsByForm, latest10KDate }`. Counts use exact form names and filing
  dates inside the window. No recent filings yields `{}`. Latest exact `10-K` considers all history through today,
  including older archives; no eligible `10-K` yields `null`. Amendments and foreign forms stay distinct.
- Failure: `{ ticker, status: "error", error: { code, message } }`. A failed company has no counts or annual date.
  Valid batches return 200 even if every company fails. Unexpected internal defects return a generic HTTP 500.

Future dates are excluded from both counts and the annual date. Both endpoints share the SEC client/cache; a summary
still waits for complete history for every company. Large cold batches can be slow. The router/controller, aggregation,
batch loading, query schemas, response types, and tests are collocated under `src/server/summary/`.

## SEC history adapter

`createSecClient({ userAgent })` in `src/server/sec/client.ts` exposes `getCompanyHistory(ticker)`. It returns company
identity and filings from the recent response plus every referenced archive, deduplicated by accession number. Recent
records win overlaps. A missing primary-document filename links to the original complete submission `.txt` file.

Ticker input is trimmed and uppercased, preserving punctuation (for example, `BRK-B`). Lookup uses SEC's ticker directory,
whose coverage is incomplete; an unmapped ticker does not mean the company does not exist. CIK input is outside scope.

Reuse one client per server: requests are serialized at least 200 ms apart, with a 10-second timeout per request and no
automatic retries. Successful directory/history reads expire after five minutes; at most 20 completed company histories
are retained. Concurrent requests share work, including ticker aliases for the same CIK. A failed archive fails the entire
company read; failures are not cached. The pacing/cache are local to that client, so multiple server processes would need
coordination. Fetching complete history can make the first lookup slower.

Code is collocated under `src/server/sec/`: `client.ts` coordinates lookup/history, `http.ts` owns requests and pacing,
`cache.ts` owns reuse, and `normalize.ts` maps validated rows to filings. Domain validation, errors, and shared contracts
live in `schemas/`, `errors/`, and `types/`. `tests/` contains the business tests and fixtures. Transport/cache modules
do not depend on company or filing schemas; normalization receives typed rows and has no runtime dependency on Zod.
