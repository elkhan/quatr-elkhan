# Assignment notes

## Current status and scope

T00 was merged by you. T01 now provides the runnable React/Express skeleton, strict TypeScript, Zod configuration, Vitest tests, Biome, knip, verified run instructions, and GitHub CI. T01 is awaiting staged review, without a commit. The current suite has 9 passing tests; configuration and startup test files were removed before the CI request, and that coverage decision awaits clarification. SEC features remain unimplemented; E01–E10 coverage is pending.

The assignment targets about four hours including setup. Full history and the requested quality/review workflow put pressure on that budget. Track time during implementation; if substantially over budget, document missing work and how to finish it here. No optional extensions are planned.

User-confirmed working assumptions (2026-09-09): complete referenced history; latest 10-K across history; ticker input with a documented mapping limitation. You subsequently approved the roadmap and authorized committing, pushing, and opening its PR. Behaviors labeled “Proposal” below are the approved implementation defaults, not independently verified product requirements. See [ROADMAP.md](ROADMAP.md).

## Sources checked

- Local assignment: `Data Tooling - Coding Assignment.pdf`, both pages. Requires the two endpoints, React UI, TypeScript, run instructions, an AI prompt log, and notes on unfinished work if time runs over.
- [SEC submissions API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), checked 2026-09-09: the main response contains recent columnar history; additional files provide older history. Submissions URLs use a 10-digit CIK. Browser requests to data.sec.gov are not supported by CORS.
- [SEC data access documentation](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data), checked 2026-09-09: identifies ticker-directory coverage limits, declared User-Agent requirements, a current maximum of 10 requests/second, and archive/document path conventions.

## Ongoing edge-case register — N01

Update entries as evidence arrives. Add actual test file/test names when implemented; `pending` is not coverage. E01–E10 are anticipated SEC/feature cases; E11–E13 include setup behavior verified during T01.

| ID / owner | Edge case and reasoning | Chosen or proposed behavior | Coverage |
| --- | --- | --- | --- |
| E01 / T02 | Case/whitespace, punctuated tickers, or no mapping. The SEC directory does not guarantee complete coverage; ticker-only input cannot literally identify every filer. | Confirmed: ticker input with a visible limitation. Proposal: trim/uppercase, preserve punctuation, and return a clear 404 for an unmapped ticker. Never imply the company does not exist. | Pending: normalization units; lookup/API integration; unsupported-ticker UI acceptance. |
| E02 / T02, T04 | Older filings and latest 10-K may be in referenced files; overlaps can double-count filings. Reading only the recent array can give misleading results. | Confirmed: load all referenced history and find latest 10-K across it. Proposal: deduplicate by accession; recent data takes precedence over identical archived accessions. Fail that company explicitly if required history is unavailable. | Pending: main/archive fixtures, overlap, missing archive, historical 10-K, correct totals. |
| E03 / T02 | Empty or unequal column arrays, missing required values, invalid dates, different main/archive wrappers, and extra fields can corrupt row alignment. | Proposal: require aligned accession/form/date columns; validate dates and any present document column. Allow empty history, extra fields, and an absent optional document column (E04 fallback). Reject malformed rows instead of silently skipping them. | Pending: normalizer units and malformed SEC-response integration tests. |
| E04 / T02 | CIK padding, dashed accessions, and missing primary-document filenames can produce broken links. The accession's prefix is not necessarily the company's CIK. | Proposal: use resolved company CIK for archive paths; strip accession dashes for document directories. Link missing primary documents to original submission text. Keep URLs on sec.gov and safely encode document paths. | Pending: URL units, absent filename, CIK/accession mismatch, live link check. |
| E05 / T02 | Full history increases requests and latency. Concurrent users, SEC 403/429/5xx, invalid JSON, stalled requests, and failed cached reads must not masquerade as empty history. | Proposal: shared pacing below the current SEC limit, a finite timeout, small expiring in-memory reuse, shared in-flight reads, and no cached failures. No unbounded retries. Single-process pacing is a scope limit. | Pending: mocked transport/fake-clock tests for pacing, expiry, concurrent callers, timeout, failures, and recovery. |
| E06 / T03, T05 | Filtering or sorting only the current page yields incorrect global order/counts. Same-day filings and changed filters can create unstable pages. | Proposal: filter then sort full history with an accession tie-breaker, then paginate; reset page on ticker/filter/sort changes. Invalid page inputs return 400; valid beyond-last pages return empty items with the correct total. | Pending: order/page units, HTTP query integration, UI reset and boundary tests. |
| E07 / T03–T05 | Amendment and foreign forms cannot be treated as interchangeable with domestic originals. A company may have annual filings but no exact 10-K. | Proposal: exact form matching/counting; keep `10-K/A` distinct; allow forms beyond the example list. Return `null`/“None found” for absent exact 10-K; never substitute another form. | Pending: amendment/foreign-form fixtures, summary units, UI empty-10-K state. |
| E08 / T04 | “Last 12 months” leaves cutoff, timezone, leap-day, and future-date behavior unspecified. Reporting period differs from filing date. | Proposal: filing dates in the inclusive range from the UTC date 12 calendar months ago through today; clamp leap day and exclude future filings. Latest 10-K remains independent of this window. | Pending: fixed-clock cutoff/today/outside-window/leap-day tests and old 10-K test. |
| E09 / T04, T05 | Duplicate tickers can waste requests; empty/oversized sets need bounds. One company's failure must not look like zero filings or erase successful results. | Proposal: require 1–10 unique normalized tickers and preserve first-requested order. Invalid overall input gets 400; valid batches get 200 with explicit per-company successes/errors, including all-failure batches. Single-company HTTP errors follow the separate filings contract. | Pending: query units/integration, repeated parameters, mixed/all failures, empty counts, summary UI tests. |
| E10 / T05 | A slow old response can overwrite a new company/filter/summary request. Errors and empty results need distinct states and recovery. | Proposal: cancel obsolete requests or ignore stale responses; show labeled loading/empty/error states and allow retry. Keep keyboard use and narrow-screen tables practical. | Pending: out-of-order response and recovery UI tests; keyboard/narrow-screen acceptance. |
| E11 / T01, T03, T06 | Missing/blank config, malformed ports, missing production assets, and unknown API paths can hide startup or routing failures. A Vite dev page alone does not prove production start works. | Implemented for setup: validate configuration before binding; reject missing built client files; return JSON 404s without a catch-all HTML fallback. Development ports are configurable without stopping other applications. | Current coverage: [app import test](src/server/app.test.ts), [HTTP tests](src/server/app.integration.test.ts), and acceptance below. `config.test.ts` and `startup.integration.test.ts` were removed before the CI request; their automated coverage is now open pending clarification. Filing query validation remains T03; end-to-end features remain T06. |
| E12 / T01 | Express 5 calls the `listen` callback on a bind error too. A callback that ignores the error can log success before reporting a port conflict. This was observed in acceptance testing. | Log success only on the server's `listening` event; port conflicts exit 1 with a port-specific error and no success message. | Previously verified red/green and against the production build. The regression assertion was in the subsequently removed `startup.integration.test.ts`; current automated coverage is open pending clarification. |
| E13 / T01 | Latest package versions were not a compatible set: Vitest 5 exposed declaration errors under strict checking; the current DOM test environment needs a newer Node patch than the shell default. | Pin the tested Vitest 4.1.11 release and Node 22.22.2, which was already installed. Keep strict checks, including dependency declarations; no `skipLibCheck`, dependency patches, or blanket suppressions. | Verified by type checking, tests, and a fresh locked installation; the CI follow-up rechecked the current 9-test suite. Exact dependency versions and bun.lock preserve the tested combination. |
| E14 / T01 | CI can drift from local runtime versions, rely on an untracked environment file, or overlook failed checks. | Read Node from `.nvmrc` and Bun from `package.json`; install with `--frozen-lockfile`; run every quality/test/build step without error suppression. PRs use read-only repository access and no project secrets. | [Workflow](.github/workflows/ci.yml) passes actionlint; its run commands pass locally without `.env`. GitHub-hosted execution remains pending publication. |

## Critical assessment

- **Budget:** Complete historical retrieval is the largest cost/risk. Fetching many archives can delay the first response even with bounded in-memory reuse. Measure the live behavior during T02; ask before reducing history or adding background processing.
- **Coverage claim:** Ticker-directory lookup meets the chosen input model but cannot promise every SEC filer. README.md and UI errors must state the mapping limitation. CIK fallback is deliberately outside the confirmed scope.
- **Annual-form semantics:** A literal latest 10-K is precise but is not a general “latest annual report.” Label it accordingly so foreign-company results are not misleading.
- **Review sequence:** Individual PR review adds elapsed time beyond coding. The assistant must stop at staged review before committing, and must never merge. The assignment's final GitHub publication happens only after your authorization.
- **Validation limits:** Deterministic fixtures establish expected behavior; limited live SEC checks establish actual connectivity and link behavior. Neither replaces the other. Record a failed/blocked live check explicitly.

## Adversarial review and validation log

### 2026-09-09 — T00 documentation

- Review findings addressed: use actual Markdown task checkboxes; distinguish user-confirmed scope from proposed exact-form semantics; specify batch versus single-company error behavior; reconcile missing-document fallback with required-column validation; explicitly test the initial React render; remove ambiguous lockfile commit wording.
- Checked against both assignment pages and all user instructions. All required features have an owning task; pending tests and runtime limitations are labeled. The remaining concerns are the time budget and the accepted ticker-directory coverage limit.
- Runtime checks: not applicable; documentation only, with no application scaffold yet.
- Publication review: confirmed the staged scope, checked document consistency and whitespace, and recorded approval. Initialized the empty GitHub repository with an empty `main` commit and opened [PR #1](https://github.com/elkhan/quatr-elkhan/pull/1) with all task changes on a separate branch. No merge is authorized.

### 2026-09-09 — T01 project setup

Approximately 20 minutes of implementation and verification, including dependency compatibility checks. No SEC requests were made; acceptance used a placeholder identity only in an isolated temporary copy.

The results in this section record the original T01 handoff before the two test files were removed. See the CI follow-up for current coverage.

**Red/green evidence:**

- `bun run test:unit`: 19 configuration tests initially failed on missing validation; the import-without-listening guard passed. Final result: 20 server unit tests and 1 React rendering test pass.
- `vitest run --project ui`: the initial render test failed because the heading was absent, then passed with the page implemented.
- `bun run test:integration`: 6 initial HTTP tests failed on missing health/static responses and HTML 404s; 3 startup tests failed on missing failure handling. Final result: 10 integration tests pass.
- Added failing regression checks for missing client assets and misleading startup-success output, then fixed both. Tests use real local HTTP connections and child processes; no application behavior is mocked.

**Verification:**

- Fresh `bun install --frozen-lockfile`, `bun run typecheck`, `bun run check`, `bun run check:unused`, `bun run test`, and `bun run build` passed. A filter selecting no integration tests exited 1, confirming an empty suite cannot silently pass.
- `bun run start` served the built React page, `/health`, and JSON API 404s. Chrome showed the expected heading/content and no recorded warnings/errors. Production startup correctly rejected missing identity, invalid ports, and a port conflict.
- `bun run dev` served the page and proxied `/health` correctly. Ports 3000 and 5173 were already occupied by other applications, so acceptance used `PORT=3100` and `CLIENT_PORT=5174`. Ctrl-C stopped both development processes; the test ports were verified closed afterward.
- The Bun installer command was checked against official documentation; existing Bun 1.4.2 and Node 22.22.2 were used. No global runtime installation was needed.

**Adversarial review:**

| Dimension | Result |
| --- | --- |
| Correctness | Fixed the Express listen-callback issue; moved missing-client validation to the tested application factory; checked API errors and production startup. No unresolved T01 defect identified. |
| Security | Local-only binding, ignored local environment files, and a placeholder-only example. Configuration errors omit the supplied identity; SEC traffic is not implemented yet. |
| Performance | One package, a static React entry, and no database, service framework, polling, or background tasks. |
| Maintainability | Unit/UI/integration suites are separated, startup is isolated from app imports, versions are pinned, and strict checks pass without suppressions. Removed a brittle UI assertion that would unnecessarily prohibit later input controls. |

### 2026-09-09 — T01 GitHub CI follow-up

- Added one Ubuntu job for PRs and pushes to `main`. It runs the existing type, Biome, knip, unit/React, integration, and build commands with pinned action revisions and project runtime versions. Older runs for the same PR/branch are canceled; each job has a 10-minute limit.
- Verified the official action references and inputs, then validated the workflow with actionlint 1.7.12. All workflow commands passed locally: 1 server unit test, 1 React test, and 7 HTTP integration tests. Build/start acceptance verified health JSON, the HTML page, its built JavaScript asset, and JSON API 404 behavior; the test server was stopped afterward.
- Adversarial review: no failure suppression, write permission, project-secret dependency, or live SEC request was introduced. No application code changed. The remaining review finding is the configuration/startup coverage gap from the test removals; the files were left untouched while asking for your decision.
- This is local validation of the workflow and its commands. GitHub Actions has not run it yet because this branch has not been committed or pushed.

## Remaining work and completion notes

- T01 is implemented and validated, pending your staged review and later commit/PR authorization. T02–T06 remain unimplemented.
- Next: T02 ticker resolution, full SEC history retrieval, normalization, and their unit/integration tests. Configure a real SEC User-Agent identity before live SEC acceptance checks.
- CI syntax, its local commands, and build/start acceptance pass. The configuration/startup test removals await clarification; GitHub-hosted CI validation awaits authorized publication. Future work and accepted scope limitations remain as described in the roadmap and E01–E10.
