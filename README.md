# SEC filings

TypeScript, React, Express, Zod, and Vitest. Project setup and the SEC history adapter are implemented. Filing endpoints
and the interactive UI are next; see [ROADMAP.md](ROADMAP.md).

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

## Check

```sh
bun run typecheck
bun run check
bun run check:unused
bun run test
```

`bun run test:unit` runs filing normalization and existing skeleton unit/React tests. `bun run test:integration` exercises
the SEC adapter with synthetic SEC responses and existing local HTTP checks. Tests use Vitest, require permission to open
local ports, and make no live SEC requests. Use
`bun run test`, since `bun test` invokes Bun's different test runner. `bun run format` applies Biome's safe
formatting/import fixes.

Before handoff, also build/start and check the page in a browser plus `curl -fsS http://127.0.0.1:3000/health`.
Validation evidence and edge cases are in [NOTES.md](NOTES.md); AI prompts are in [PROMPTS.md](PROMPTS.md).

[GitHub CI](.github/workflows/ci.yml) runs type, formatting/lint, unused-code, unit/React, integration, and production-build
checks on every PR and push to `main`. It uses the versions in `.nvmrc` and `package.json`, a frozen lockfile, and no
project secrets or live SEC data. New commits cancel older runs for the same PR or branch.

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
