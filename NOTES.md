# Assignment notes

## Current status and scope

T00 and T01 were reviewed and merged by you ([PR #1](https://github.com/elkhan/quatr-elkhan/pull/1), [PR #2](https://github.com/elkhan/quatr-elkhan/pull/2)). T02 implements ticker lookup and complete normalized SEC history, with 24 new business tests; all 33 current tests and local quality/build/start/acceptance checks pass. You reviewed the staged changes and authorized the T02 commit, push, and PR. Live SEC acceptance remains pending approval to send the configured contact identity. T03–T07 remain outstanding.

Your latest testing guidance resolves the earlier configuration/startup coverage question: those redundant tests remain removed. New tests cover filing behavior and SEC failures, not setup/configuration; build/start are still checked at handoff.

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
| E01 / T02 | Case/whitespace, punctuated tickers, or no mapping. The SEC directory does not guarantee complete coverage; ticker-only input cannot literally identify every filer. Multiple share-class tickers can resolve to one CIK. | Implemented: trim/uppercase, preserve punctuation, explicit invalid-input/unmapped errors. Share history by CIK but retain each requested ticker in the result. | [Adapter tests](src/server/sec/tests/client.integration.test.ts): input resolution, punctuation/aliases/concurrent callers, unmapped versus empty history. HTTP 404 mapping remains T03; visible UI limitation remains T05. |
| E02 / T02, T04 | Older filings and latest 10-K may be in referenced files; overlaps can double-count filings. Reading only the recent array can give misleading results. | Implemented: load every referenced file, deduplicate accessions, keep recent records over archived duplicates. Any required archive failure fails the company read. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): overlapping sources; [adapter tests](src/server/sec/tests/client.integration.test.ts): both archives, historical 10-K, exact accessions, archive failure/recovery. Local HTTP acceptance also passed. Latest-10-K summary calculation remains T04. |
| E03 / T02 | Empty or unequal column arrays, missing required values, invalid dates, different main/archive wrappers, and extra fields can corrupt row alignment. | Implemented: Zod validates aligned required columns, calendar dates, and any present document column. Empty history and unrelated fields are allowed; malformed data is rejected rather than skipped. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): missing/ragged columns, blank form, malformed accession, impossible versus valid leap dates, empty history. [Adapter tests](src/server/sec/tests/client.integration.test.ts): main/archive shapes, malformed directory/archive and invalid JSON, followed by recovery. |
| E04 / T02 | CIK padding, dashed accessions, and missing primary-document filenames can produce broken links. The accession's prefix is not necessarily the company's CIK. | Implemented: company CIK drives links; submissions use ten digits, document paths use the unpadded CIK and undashed accession. Missing/blank primary documents use the original submission text. Preserve subdirectories and encode filename segments; reject traversal. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): document/text URLs, absent column, blank filename, differing accession prefix, reserved characters and traversal. [Adapter tests](src/server/sec/tests/client.integration.test.ts): padded CIK URLs, unsafe archive references and company mismatch. Live link check pending identity approval. |
| E05 / T02 | Full history increases requests and latency. Concurrent users, SEC 403/429/5xx, invalid JSON, stalled requests, and failed cached reads must not masquerade as empty history. | Implemented: one shared request queue per client, at least 200 ms between starts, ten-second request timeout including body reads, no automatic retries. Successful reads expire after five minutes; at most 20 completed company histories are retained. In-flight reads are shared and failures removed. Use one client per server in T03; coordination across processes is outside scope. | [Adapter tests](src/server/sec/tests/client.integration.test.ts): shared pacing, aliases/concurrency, reuse/expiry, 403/429/503, malformed data, network failure, timeout and subsequent recovery. Local HTTP acceptance verifies actual transport failure/recovery. |
| E06 / T03, T05 | Filtering or sorting only the current page yields incorrect global order/counts. Same-day filings and changed filters can create unstable pages. | Proposal: filter then sort full history with an accession tie-breaker, then paginate; reset page on ticker/filter/sort changes. Invalid page inputs return 400; valid beyond-last pages return empty items with the correct total. | Pending: order/page units, HTTP query integration, UI reset and boundary tests. |
| E07 / T03–T05 | Amendment and foreign forms cannot be treated as interchangeable with domestic originals. A company may have annual filings but no exact 10-K. | Proposal: exact form matching/counting; keep `10-K/A` distinct; allow forms beyond the example list. Return `null`/“None found” for absent exact 10-K; never substitute another form. | Pending: amendment/foreign-form fixtures, summary units, UI empty-10-K state. |
| E08 / T04 | “Last 12 months” leaves cutoff, timezone, leap-day, and future-date behavior unspecified. Reporting period differs from filing date. | Proposal: filing dates in the inclusive range from the UTC date 12 calendar months ago through today; clamp leap day and exclude future filings. Latest 10-K remains independent of this window. | Pending: fixed-clock cutoff/today/outside-window/leap-day tests and old 10-K test. |
| E09 / T04, T05 | Duplicate tickers can waste requests; empty/oversized sets need bounds. One company's failure must not look like zero filings or erase successful results. | Proposal: require 1–10 unique normalized tickers and preserve first-requested order. Invalid overall input gets 400; valid batches get 200 with explicit per-company successes/errors, including all-failure batches. Single-company HTTP errors follow the separate filings contract. | Pending: query units/integration, repeated parameters, mixed/all failures, empty counts, summary UI tests. |
| E10 / T05 | A slow old response can overwrite a new company/filter/summary request. Errors and empty results need distinct states and recovery. | Proposal: cancel obsolete requests or ignore stale responses; show labeled loading/empty/error states and allow retry. Keep keyboard use and narrow-screen tables practical. | Pending: out-of-order response and recovery UI tests; keyboard/narrow-screen acceptance. |
| E11 / T01, T03, T06 | Missing/blank config, malformed ports, missing production assets, and unknown API paths can hide startup or routing failures. A Vite dev page alone does not prove production start works. | Implemented for setup: validate configuration before binding; reject missing built client files; return JSON 404s without a catch-all HTML fallback. Development ports are configurable without stopping other applications. | Existing [app import test](src/server/app.test.ts), [HTTP tests](src/server/app.integration.test.ts), and acceptance below. You removed the extra configuration/startup tests and confirmed business-focused testing. Filing query validation remains T03; end-to-end features remain T06. |
| E12 / T01 | Express 5 calls the `listen` callback on a bind error too. A callback that ignores the error can log success before reporting a port conflict. This was observed in acceptance testing. | Log success only on the server's `listening` event; port conflicts exit 1 with a port-specific error and no success message. | Verified red/green and against the production build during T01. The extra startup test suite was subsequently removed by you; no replacement setup suite is planned. |
| E13 / T01 | Latest package versions were not a compatible set: Vitest 5 exposed declaration errors under strict checking; the current DOM test environment needs a newer Node patch than the shell default. | Pin the tested Vitest 4.1.11 release and Node 22.22.2, which was already installed. Keep strict checks, including dependency declarations; no `skipLibCheck`, dependency patches, or blanket suppressions. | Verified by type checking, tests, and a fresh locked installation; the CI follow-up rechecked the current 9-test suite. Exact dependency versions and bun.lock preserve the tested combination. |
| E14 / T01 | CI can drift from local runtime versions, rely on an untracked environment file, or overlook failed checks. | Read Node from `.nvmrc` and Bun from `package.json`; install with `--frozen-lockfile`; run every quality/test/build step without error suppression. PRs use read-only repository access and no project secrets. | [Workflow](.github/workflows/ci.yml) passes actionlint; its run commands pass locally without `.env`. [CI passed on merged main](https://github.com/elkhan/quatr-elkhan/actions/runs/34370626478). |
| E15 / T02 | Awaiting cancellation of a cloned response body hung the test transport and hid the HTTP failure. A failed request must also release the queue for later work. | Abort rejected HTTP requests through their controller, then report the status immediately. Reset the pacing queue on success and failure. | [Adapter tests](src/server/sec/tests/client.integration.test.ts): archive HTTP 403/429/503 initially timed out, then passed with explicit errors and successful recovery. Confirmed with a real local HTTP 503 during acceptance. |

## Critical assessment

- **Budget:** Complete historical retrieval is the largest cost/risk. Fetching many archives can delay the first response even with bounded in-memory reuse. Measure the live behavior during T02; ask before reducing history or adding background processing.
- **Coverage claim:** Ticker-directory lookup meets the chosen input model but cannot promise every SEC filer. README.md and UI errors must state the mapping limitation. CIK fallback is deliberately outside the confirmed scope.
- **Annual-form semantics:** A literal latest 10-K is precise but is not a general “latest annual report.” Label it accordingly so foreign-company results are not misleading.
- **Review sequence:** Individual PR review adds elapsed time beyond coding. The assistant must stop at staged review before committing, and must never merge. The assignment's final GitHub publication happens only after your authorization.
- **Validation limits:** Deterministic fixtures establish expected behavior; limited live SEC checks establish actual connectivity and link behavior. Neither replaces the other. Record a failed/blocked live check explicitly.

## Accepted tradeoffs

These choices follow the approved roadmap and reviewed T02 implementation. They fit the assignment's delivery budget;
they do not establish production readiness. Later endpoint/UI behavior is labeled as planned.

| Decision | Reason and accepted cost |
| --- | --- |
| One package and an in-memory SEC client; no database or distributed cache. | Keeps installation and operation small. Restarts lose cached data; horizontal scaling needs additional coordination as described below. |
| Complete referenced history, deduplicated by accession; recent records win overlaps. | Preserves older filings and supports the planned latest-10-K calculation. Cold lookups fetch every archive and can be slow. Any malformed or unavailable required archive fails the company read rather than returning partial history. |
| Serialized SEC requests, a ten-second timeout per request, and no automatic retries. | Keeps traffic and failure behavior predictable. Queue waiting and a complete multi-file lookup have no overall deadline; a slow request delays other callers. A later caller can retry after failure. |
| Five-minute reuse of successful reads, with no stale-result fallback on refresh failure. | Reduces repeated downloads. New or corrected filings are not visible until refresh; failed refreshes remain explicit errors. The TTL starts after loading completes, so it is not a guarantee that every underlying record is at most five minutes old. |
| Ticker-directory lookup only, preserving punctuation. | Matches the confirmed input model. Unmapped tickers cannot be resolved even when the filer exists; CIK input is outside scope. |
| Original submission text when the primary-document filename is absent. | Keeps a source link without guessing a document. The link can open the whole submission rather than a convenient individual report. |
| Planned summaries use exact form names, an inclusive UTC twelve-calendar-month window, and latest exact `10-K` across all history. | Gives precise, reproducible semantics. Amendments remain separate; a foreign filer can have annual reports but no `10-K`. Implementation remains T04. |

### Cache limitations under horizontal scaling

The cache and request queue are closure state in [cache.ts](src/server/sec/cache.ts) and
[http.ts](src/server/sec/http.ts). The intended T03 integration reuses one SEC client per server process.

- **No shared work or consistency across instances.** Each client has its own directory/history cache and in-flight
  promises. Multiple workers or replicas can download the same history concurrently and return snapshots of different
  ages. A restart, deployment, or scale-out creates cold caches; expiry is refreshed on demand rather than in the background.
- **Pacing is local, too.** Each instance spaces request starts by at least 200 ms. Aggregate traffic grows with the
  number of instances and can exceed SEC's published limit, particularly through shared egress. A shared cache alone
  would not coordinate misses or enforce a deployment-wide request rate.
- **The capacity is not a memory bound.** Each history cache retains at most 20 completed entries, evicted by insertion
  order rather than recent use. History sizes vary, expired entries remain until access/eviction, and in-flight entries
  are exempt from that limit. The request queue is also unbounded. More instances duplicate this memory; bursts of unique
  companies can increase memory and waiting time even within one process.
- **Failure recovery is local and demand-driven.** Failed loads are removed rather than cached. The next caller retries
  the whole history; repeated callers or cold replicas can keep retrying during an outage. There is no shared cooldown,
  backoff, cancellation of queued work, or background refresh.

For an actual multi-instance deployment, revisit shared cached results and cross-instance in-flight coordination **and**
aggregate request pacing, or centralize SEC fetching in one service. Queue/concurrency bounds, memory sizing, and freshness
requirements also need workload evidence. Those are future design choices, not additions to this assignment. Current
tests cover one client's reuse, expiry, pacing, and recovery; no multi-replica or load-testing claim is made.

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

### 2026-09-09 — T02 SEC history adapter

Approximately 20 minutes of implementation and local verification. Scope is the adapter and normalization; API endpoints
remain T03. No dependencies, setup tests, or configuration options were added.

- **Red → green:** `bunx --no-install vitest run --project unit --project integration src/server/sec` first failed all
  24 behavior cases against unimplemented functions. After implementation, all 24 pass: 10 normalization units and 14
  adapter integration cases. The full suite passes 33 tests, including the 9 existing skeleton tests.
- **Quality/build:** `bun run typecheck`, `bun run check`, `bun run check:unused`, `bun run test`, and `bun run build`
  pass with the pinned runtimes. No dependency or lockfile change was needed.
- **Acceptance:** Ran the adapter under Bun against a real local HTTP fixture server. Verified complete history from
  two archives, four unique accessions, the archive-only 10-K, original-text fallback, explicit failure of the whole
  company on the oldest archive's 503, successful retry, and shared concurrent reads (seven HTTP requests total).
  `PORT=3100 bun run start` served health JSON, the HTML page, and its built JavaScript. Both local servers were stopped.
  The frontend is unchanged; no new browser flow exists in T02.
- **Adversarial review:** Checked wrong-company data, unsafe archive/document paths, redirects, missing/ragged columns,
  incomplete-history failure, cache poisoning by failed reads, alias identity, and queue recovery. Fixed the response
  cleanup hang described in E15. Requests use fixed SEC hosts with redirects disabled; error messages omit the configured
  identity. This first handoff used two implementation modules; your subsequent review identified inadequate separation
  of responsibilities. The structural follow-up below addresses that finding. Live data compatibility and link access
  remain unverified pending identity approval.

### 2026-09-09 — T02 structure review follow-up

- **Review finding and decision:** The first version combined validation, error handling, HTTP scheduling, caching, and
  history retrieval in `client.ts`. Treating a low file count as simplicity made it harder to review. Code structure is
  now an explicit working-agreement and adversarial-review priority.
- **Separation:** SEC-owned `schemas/`, `errors/`, and `types/` hold domain validation, errors, and reusable contracts.
  `client.ts` coordinates named directory, company, submissions, archive, and history operations. `http.ts` owns request
  pacing/timeouts, `cache.ts` owns reuse, and `normalize.ts` owns document URLs and accession deduplication. Tests and
  fixtures are together in `tests/`; no global utility directory or additional service framework was introduced.
- **Coupling and edge behavior:** HTTP/cache modules have no dependency on company or filing schemas. Normalization
  consumes typed rows without Zod or casts. External-data types are inferred from schemas; the public filing type selects
  its explicit fields so an added upstream field cannot silently expand the output contract. An absent document column
  becomes an empty filename at validation; present malformed columns still fail, and the original-text fallback is
  preserved. Deduplication now has one owner, with recent data first and every source validated before normalization.
- **Validation:** This is the refactor phase of the existing TDD cycle: the 24 SEC behavior tests passed before and after
  restructuring. Assertions were retained; unit inputs now pass through the extracted filing schema before normalization.
  The full 33-test suite, type checking, Biome, knip, and production build pass. No setup or file-layout tests were added.
- **Acceptance:** Repeated the real local HTTP fixture checks for complete history, deduplication, archive failure,
  recovery, and concurrent reuse. Production start, health JSON, HTML, and the built JavaScript asset passed on port 3100.
  Both local servers were stopped. Live SEC checks remain pending the existing identity approval.
- **Adversarial review:** Correctness: existing lookup/filing results and error codes pass their business assertions.
  Security: fixed SEC URLs, reference/path validation, redirects disabled, and identity omitted from errors are retained.
  Performance: request pacing, cache expiry, and concurrent reuse remain intact. Maintainability: named operations,
  schema-derived contracts, isolated transport/cache code, no casts, and test-only fixtures address the review feedback.
  Schema modules intentionally translate validation failures into SEC-domain errors; they do not depend on HTTP or cache.
  No unresolved local defect identified; live compatibility remains unverified.

### 2026-09-09 — T02 publication and tradeoff documentation

- You approved committing, pushing, and opening a normal PR after reviewing the staged refactor. Added the cache scaling
  limitations and accepted tradeoffs above, and T07 for final documentation alignment.
- Adversarial documentation review checked the claims against the cache/HTTP implementation: process-local state,
  independent freshness, insertion-order eviction, the completed-entry limit, unbounded in-flight/queued work, and
  request-level rather than whole-lookup timeouts. Future distributed coordination is explicitly outside current scope.
- These follow-up edits are documentation-only. The reviewed source is unchanged from the passing 33-test suite,
  quality/build/start checks, and local HTTP acceptance recorded above; GitHub CI will validate the published branch.

## Remaining work and completion notes

- T00/T01 are merged. T02 staged review is complete and publication is authorized; implementation, deterministic tests,
  quality checks, and local acceptance pass. PR review and live SEC acceptance remain pending.
- Live checks for Apple, Spotify, JPMorgan Chase and representative document links await approval to send `SEC_USER_AGENT` from `.env` to SEC. Automatic approval review rejected that request because the value may contain private name/contact data. No workaround or external identity transmission was attempted. This is a blocked check, not a pass.
- Next after T02 PR review: T03 exposes the adapter through the paginated/filterable filings endpoint and creates one
  shared SEC client for the server. T04 summary, T05 UI, T06 final acceptance, N01 final edge-case notes, and T07 final
  documentation alignment follow; there is no need for another setup/config test suite.
