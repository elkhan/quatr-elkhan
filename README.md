# SEC filings

TypeScript, React, Express, Zod, and Vitest. Project setup is implemented; SEC lookup, filing endpoints, and the
interactive UI are tracked in [ROADMAP.md](ROADMAP.md).

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
No SEC API key is needed. This setup does not yet make SEC requests.

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

`bun run test:unit` runs server unit tests and React rendering tests; `bun run test:integration` exercises real HTTP
requests. Tests use Vitest, require permission to open local ports, and make no SEC requests. Use
`bun run test`, since `bun test` invokes Bun's different test runner. `bun run format` applies Biome's safe
formatting/import fixes.

Before handoff, also build/start and check the page in a browser plus `curl -fsS http://127.0.0.1:3000/health`.
Validation evidence and edge cases are in [NOTES.md](NOTES.md); AI prompts are in [PROMPTS.md](PROMPTS.md).

[GitHub CI](.github/workflows/ci.yml) runs type, formatting/lint, unused-code, unit/React, integration, and production-build
checks on every PR and push to `main`. It uses the versions in `.nvmrc` and `package.json`, a frozen lockfile, and no
project secrets or live SEC data. New commits cancel older runs for the same PR or branch.
