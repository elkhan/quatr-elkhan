# Assignment notes

## Current status and scope

T00–T02 were reviewed and merged by you ([PR #1](https://github.com/elkhan/quatr-elkhan/pull/1), [PR #2](https://github.com/elkhan/quatr-elkhan/pull/2), [PR #3](https://github.com/elkhan/quatr-elkhan/pull/3)). T03 adds the paginated, filterable filings endpoint and HTTP security controls, awaiting staged review without a commit. All 75 current tests, quality checks, build/start, and local HTTP/browser acceptance pass. Manual live checks for all three example companies and source-document retrieval pass using the explicitly authorized dummy SEC identity. T04–T07 remain outstanding.

Your testing guidance resolves the earlier configuration/startup coverage question: those redundant tests remain removed. T03 replaces the eight remaining server setup assertions with filings HTTP behavior tests. Startup and static assets are checked through acceptance; no additional setup/configuration test suite is planned.

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
| E01 / T02, T03 | Case/whitespace, punctuated tickers, or no mapping. The SEC directory does not cover every filer; share-class aliases can resolve to one CIK. | Trim/uppercase without losing punctuation, share history by CIK, and retain the requested ticker. The endpoint returns 400 for blank input and a directory-limitation 404 for unmapped input. | [Adapter tests](src/server/sec/tests/client.integration.test.ts) cover aliases; [route tests](src/server/filings/tests/routes.integration.test.ts) cover normalization, invalid input before fetching, and unmapped 404. The visible UI limitation remains T05. |
| E02 / T02, T04 | Older filings and latest 10-K may be in referenced files; overlaps can double-count filings. Reading only the recent array can give misleading results. | Implemented: load every referenced file, deduplicate accessions, keep recent records over archived duplicates. Any required archive failure fails the company read. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): overlapping sources; [adapter tests](src/server/sec/tests/client.integration.test.ts): both archives, historical 10-K, exact accessions, archive failure/recovery. Local HTTP acceptance also passed. Latest-10-K summary calculation remains T04. |
| E03 / T02 | Empty or unequal column arrays, missing required values, invalid dates, different main/archive wrappers, and extra fields can corrupt row alignment. | Implemented: Zod validates aligned required columns, calendar dates, and any present document column. Empty history and unrelated fields are allowed; malformed data is rejected rather than skipped. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): missing/ragged columns, blank form, malformed accession, impossible versus valid leap dates, empty history. [Adapter tests](src/server/sec/tests/client.integration.test.ts): main/archive shapes, malformed directory/archive and invalid JSON, followed by recovery. |
| E04 / T02 | CIK padding, dashed accessions, and missing primary-document filenames can produce broken links. The accession's prefix is not necessarily the company's CIK. | Implemented: company CIK drives links; submissions use ten digits, document paths use the unpadded CIK and undashed accession. Missing/blank primary documents use the original submission text. Preserve subdirectories and encode filename segments; reject traversal. | [Normalizer tests](src/server/sec/tests/normalize.test.ts): document/text URLs, absent column, blank filename, differing accession prefix, reserved characters and traversal. [Adapter tests](src/server/sec/tests/client.integration.test.ts): padded CIK URLs, unsafe archive references and company mismatch. Manual live document retrieval returned HTTP 200 for AAPL, SPOT, and JPM on 2026-09-09; interactive document navigation remains part of T05/T06. |
| E05 / T02, T03 | Full history increases requests and latency. Concurrent callers and upstream failures must not masquerade as empty history. | Startup injects one shared client. Requests are paced, successful reads reused, and failures removed. SEC rejection/data failure maps to 502 and timeout to 504; no partial history is returned. Scaling limitations are documented below. | [Adapter tests](src/server/sec/tests/client.integration.test.ts) cover pacing/cache/concurrency/recovery; [route tests](src/server/filings/tests/routes.integration.test.ts) cover shared reuse and HTTP failure mapping. Compiled-app acceptance verifies real local HTTP failure/recovery and timeout. |
| E06 / T03, T05 | Filtering/sorting only one page loses global order and totals; sorting a cached array mutates results for other callers. Large valid page values can overflow offset arithmetic. | Filter the full history, sort a copy by filing date then accession in the selected direction, then paginate. Return empty results beyond the last page and check page count before multiplying offsets. UI resets remain T05. | [Listing units](src/server/filings/tests/service.test.ts) cover global operations, ties, a frozen shared array, empty/last/beyond-end pages and MAX_SAFE_INTEGER; [route tests](src/server/filings/tests/routes.integration.test.ts) cover archive records, metadata, and query controls. UI reset tests remain pending. |
| E07 / T03–T05 | Amendments and foreign forms cannot be treated as interchangeable with domestic originals. | The endpoint uses exact case-sensitive form matching after trimming, including forms beyond the example list. Planned summary counts keep exact forms; no exact 10-K will return null rather than substituting 20-F. | [Listing units](src/server/filings/tests/service.test.ts) cover 10-K, 10-K/A and 20-F; [route tests](src/server/filings/tests/routes.integration.test.ts) verify exact filtering over archived data. Summary and UI behavior remain T04/T05. |
| E08 / T04 | “Last 12 months” leaves cutoff, timezone, leap-day, and future-date behavior unspecified. Reporting period differs from filing date. | Proposal: filing dates in the inclusive range from the UTC date 12 calendar months ago through today; clamp leap day and exclude future filings. Latest 10-K remains independent of this window. | Pending: fixed-clock cutoff/today/outside-window/leap-day tests and old 10-K test. |
| E09 / T04, T05 | Duplicate tickers can waste requests; empty/oversized sets need bounds. One company's failure must not look like zero filings or erase successful results. | Proposal: require 1–10 unique normalized tickers and preserve first-requested order. Invalid overall input gets 400; valid batches get 200 with explicit per-company successes/errors, including all-failure batches. Single-company HTTP errors follow the separate filings contract. | Pending: query units/integration, repeated parameters, mixed/all failures, empty counts, summary UI tests. |
| E10 / T05 | A slow old response can overwrite a new company/filter/summary request. Errors and empty results need distinct states and recovery. | Proposal: cancel obsolete requests or ignore stale responses; show labeled loading/empty/error states and allow retry. Keep keyboard use and narrow-screen tables practical. | Pending: out-of-order response and recovery UI tests; keyboard/narrow-screen acceptance. |
| E11 / T01, T03, T06 | Missing configuration/assets and malformed or unknown API paths can hide startup/routing failures. | Configuration and missing production assets fail startup. API validation and routing failures return JSON; malformed path decoding returns 400, and unknown routes return 404. | [Route tests](src/server/filings/tests/routes.integration.test.ts) cover request validation, malformed path encoding and JSON 404s. Server setup tests were retired in favor of business tests; production startup/static behavior is verified by acceptance. Full UI/API acceptance remains T06. |
| E12 / T01 | Express 5 calls the `listen` callback on a bind error too. A callback that ignores the error can log success before reporting a port conflict. This was observed in acceptance testing. | Log success only on the server's `listening` event; port conflicts exit 1 with a port-specific error and no success message. | Verified red/green and against the production build during T01. The extra startup test suite was subsequently removed by you; no replacement setup suite is planned. |
| E13 / T01 | Latest package versions were not a compatible set: Vitest 5 exposed declaration errors under strict checking; the current DOM test environment needs a newer Node patch than the shell default. | Pin the tested Vitest 4.1.11 release and Node 22.22.2, which was already installed. Keep strict checks, including dependency declarations; no `skipLibCheck`, dependency patches, or blanket suppressions. | Verified by type checking, tests, and a fresh locked installation; the CI follow-up rechecked the current 9-test suite. Exact dependency versions and bun.lock preserve the tested combination. |
| E14 / T01 | CI can drift from local runtime versions, rely on an untracked environment file, or overlook failed checks. | Read Node from `.nvmrc` and Bun from `package.json`; install with `--frozen-lockfile`; run every quality/test/build step without error suppression. PRs use read-only repository access and no project secrets. | [Workflow](.github/workflows/ci.yml) passes actionlint; its run commands pass locally without `.env`. [CI passed on merged main](https://github.com/elkhan/quatr-elkhan/actions/runs/34370626478). |
| E15 / T02 | Awaiting cancellation of a cloned response body hung the test transport and hid the HTTP failure. A failed request must also release the queue for later work. | Abort rejected HTTP requests through their controller, then report the status immediately. Reset the pacing queue on success and failure. | [Adapter tests](src/server/sec/tests/client.integration.test.ts): archive HTTP 403/429/503 initially timed out, then passed with explicit errors and successful recovery. Confirmed with a real local HTTP 503 during acceptance. |
| E16 / T03 | A lone Unicode surrogate in a document filename passes ordinary string checks but makes URL encoding throw, incorrectly surfacing as 500. | Reject malformed Unicode as invalid SEC data (502); preserve valid surrogate pairs such as emoji. | Reproduced red/green in [SEC normalization tests](src/server/sec/tests/normalize.test.ts) and [route tests](src/server/filings/tests/routes.integration.test.ts). The existing encoded-filename case now also covers a valid emoji. |
| E17 / T03 | Repeated/nested query values, unknown keys, blank values and unsafe numbers can be coerced or silently ignored. | Parse scalar decimal integer values strictly, cap page size at 100, and reject malformed input before SEC requests. Unknown keys currently return 400, as proposed while awaiting user feedback. | [Route tests](src/server/filings/tests/routes.integration.test.ts): numeric bounds, fractions/exponent syntax, repeated fields, invalid sort, blank form/page, misspelled keys and nested input; no SEC request on validation failure. |
| E18 / T03 | Large URLs and bodies on read-only requests can consume resources before useful work. Chunked bodies have no Content-Length. | Limit the encoded path/query to 4096 bytes (414 above the limit); reject any transfer encoding or positive Content-Length (413) before SEC work, without buffering a body. Content-Length: 0 and requests without bodies remain valid. These application checks are not transport-level DoS protection. | [Route tests](src/server/filings/tests/routes.integration.test.ts) cover the URL boundary, fixed-length and chunked GET bodies, no upstream work on rejection, and ordinary successful requests. |
| E19 / T03, T05 | Security headers can break local HTTP or the built React page; missing headers on errors leave inconsistent protection. | Helmet runs before routes, guards, and static files. CSP permits same-origin scripts/styles, denies framing/objects, and uses no inline/eval exception. HTTPS upgrading and HSTS are disabled for the documented loopback HTTP runtime. | [Route tests](src/server/filings/tests/routes.integration.test.ts) cover selected security headers on success/failure. Built-page browser acceptance and deployment limitations are recorded below; recheck CSP with T05 UI changes. |
| E20 / T03 | Origin lookalikes, opaque origins, cached responses with the wrong policy, or early preflight completion can weaken an origin policy or bypass request limits. | Exact local-origin allowlist, no credentials, GET/HEAD and Accept only. Unknown/null origins return 403 before fetching; missing Origin remains valid. Vary: Origin is always set; preflight completion follows request limits. | [Route tests](src/server/filings/tests/routes.integration.test.ts) cover approved/absent/denied origins, lookalikes, preflights, error headers and URL guards. Manual local acceptance also covers development versus production, unsupported preflight methods/headers, and preflight bodies. |
| E21 / T02–T05 | Live JPM history contains 166,503 filings across the main response and 70 archives. Full retrieval can substantially outlast one SEC request's deadline. | Preserve complete history. The observed cold API lookup took about 14.5 seconds; retain visible loading/error handling in T05 and the documented queue/deadline limitations. | Manual live acceptance on 2026-09-09; counts/timings are observations, never automated test expectations. An initial probe's artificial 60-request cap stopped early; a subsequent complete endpoint check passed. |

## Critical assessment

- **Budget:** Complete historical retrieval is the largest cost/risk. Fetching many archives can delay the first response even with bounded in-memory reuse. The manual JPM lookup took about 14.5 seconds for 166,503 filings. Ask before reducing history or adding background processing.
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
[http.ts](src/server/sec/http.ts). T03 startup creates one SEC client per server process and injects it into the app.

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

## Security practices and remaining gaps

This is a local, unauthenticated, read-only viewer of public SEC data. The controls below are implemented unless marked
deferred. They do not establish readiness for public hosting. Review used the Express/React security-best-practices
guidance and the linked primary sources, checked 2026-09-09.

| ID / priority | Current behavior and reasoning | Remaining action / trigger |
| --- | --- | --- |
| S01 / medium, addressed — headers and XSS | [Helmet configuration](src/server/security/headers.ts) runs before all Express responses. Same-origin script/style CSP, no framing, no MIME sniffing, and no referrer disclosure. React currently renders text; SEC documents are returned as links, not embedded HTML. | Vite serves development HTML separately, so Express's CSP protects the built page, not Vite's page. Keep untrusted content in React text nodes; avoid raw HTML and unsafe URL schemes in T05. Recheck CSP if inline styles, external resources, or embedding become requirements. [Helmet reference](https://helmet.js.org/). |
| S02 / low, partially addressed — request size | [Request guard](src/server/security/request-limits.ts) caps encoded URLs at 4 KiB and rejects framed bodies on all current routes. No JSON, form, upload, or cookie parser is installed. A rejected body closes the connection; even an empty chunked body is rejected because its size is unknown at admission. | Before adding a body endpoint, scope its parser and give it an explicit byte limit and schema; constrain form parameter count/depth if needed. Proxy/server header, connection, and slow-request limits are deferred. The app guard runs after HTTP headers arrive, so it does not stop Slowloris or all bandwidth consumption. [OWASP Node.js guidance](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html). |
| S03 / medium, addressed — HTTP parameter pollution | Express explicitly uses the simple query parser; strict Zod schemas reject arrays, bracketed objects, unknown keys, and duplicate scalar parameters. Encoded duplicate names and prototype-style keys also return 400 before SEC work. No middleware silently chooses a first/last value; an `hpp` dependency adds no needed behavior. | Apply equivalent validation to T04's ticker-list query. Preserve these checks if changing query parsers. [Query schema](src/server/filings/schemas/query.ts). |
| S04 / medium, deferred — useful logs without sensitive data | There is no request/access logger or error-event logger yet. Startup reports status/configuration issues; configuration errors omit supplied values, SEC transport errors omit headers, and unexpected HTTP failures return generic 500 JSON. `.env` is ignored and the SEC identity stays server-side. | Add structured events if this becomes a hosted service: server-generated request ID, timestamp, method, route template, status, duration, and known error code. Never dump request/error objects, raw URLs/query strings, headers, bodies, environment, Authorization/Cookie values, or SEC_USER_AGENT/contact details. Allowlist fields, bound/escape untrusted text against log injection, restrict access/retention, and test redaction using synthetic secrets. Missing failure telemetry is an observability gap, not a completed logging solution. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). |
| S05 / conditional — CSRF | There are no user accounts, ambient credentials, sessions, cookies, or state-changing routes to protect with CSRF tokens. CORS does not provide authentication or replace CSRF protection. | If cookie-authenticated writes are added, use CSRF tokens plus Origin/Fetch Metadata checks where appropriate; SameSite cookies are defense in depth. Never introduce writes via GET. Uncredentialed requests can still consume public endpoint capacity: address that as abuse, not by adding token scaffolding. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). |
| S06 / high before public exposure, deferred — rate and resource limits | No inbound rate limiter exists. Outbound SEC pacing is per client/process; it does not limit incoming calls, queued work, total lookup duration, or upstream response bytes. Unique-company bursts can grow in-flight memory; disconnected callers do not cancel shared work. | Before public hosting, agree on an inbound budget and implement/test 429 + Retry-After, bounded active/queued lookups, overload recovery, and an overall deadline. Coordinate limits across replicas; a per-process IP limiter alone is insufficient and shared-NAT users need consideration. Choose SEC payload limits from measured history sizes. Keep the accepted complete-history requirement. [Cache limitations](#cache-limitations-under-horizontal-scaling) and [SEC transport](src/server/sec/http.ts). |
| S07 / deployment-dependent — proxy trust and HTTPS | Startup binds to 127.0.0.1. Express proxy trust remains disabled. HSTS and CSP upgrade-insecure-requests are intentionally disabled because even `bun run start` is documented as local HTTP. | For actual hosting, terminate TLS and configure trusted proxy addresses/header rewriting against the real topology before relying on client IPs for limits. Review browser HTTPS policies deliberately; do not blindly trust forwarded headers or set `trust proxy: true`. [Express security guidance](https://expressjs.com/en/advanced/best-practice-security/). |
| S08 / ongoing — upstream input and dependencies | SEC hosts are fixed; archive names/paths are validated, redirects are rejected, and fetches time out. No arbitrary user URL is fetched. Runtime/tool dependencies and the lockfile are pinned. Security additions are Helmet, cors, and the cors type definitions. | Keep dependency advisories under review; lint, tests, and pinning do not prove dependencies vulnerability-free. A dedicated vulnerability audit is not claimed. Do not expose environment values through client build variables, source assets, logs, or acceptance output. |
| S09 / medium, addressed — CORS | [Origin policy](src/server/security/cors.ts) uses exact configured origins: http://127.0.0.1:PORT, plus http://127.0.0.1:CLIENT_PORT in development. Read methods GET/HEAD and the Accept header only; no credentials or wildcard origins. Unapproved, opaque/null, and lookalike origins receive JSON 403 before SEC work. Requests without Origin remain supported for same-origin GET and CLI clients. | Vary: Origin covers approved, absent, and rejected origins; allowed origins also receive CORS headers on API errors. Preflights pass through request-size guards before 204. Origin checks cannot authenticate clients: non-browser callers can omit/spoof the header. Additional deployment origins require an explicit decision; no broad localhost/suffix matching. [Express CORS documentation](https://expressjs.com/en/resources/middleware/cors/). |

Public deployment is not in this task. S04, S06, and the deployment portions of S02/S07 remain documented follow-ups;
agree on their operational requirements before expanding scope. T07 must retain these gaps unless implemented and tested.

## Adversarial review and validation log

Entries preserve the evidence available at each handoff. Later follow-ups below supersede earlier pending-check and test-count statements.

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
  quality/build/start checks, and local HTTP acceptance recorded above. Committed and pushed T02, and opened normal
  [PR #3](https://github.com/elkhan/quatr-elkhan/pull/3); GitHub CI results are attached to the PR. No merge was performed.

### 2026-09-09 — T03 filings endpoint

- **Implementation:** `GET /companies/:ticker/filings` returns company identity, filing items, page, page size, and filtered
  total. Pure listing functions filter and sort complete history before slicing; ties use accession number in the chosen
  direction. Cached history is never mutated. Query validation precedes SEC traffic, and the app receives one shared SEC
  client from startup. API errors are JSON, including malformed URL paths and unknown routes.
- **Structure:** Route orchestration, pure listing behavior, schemas, and types are collocated under `filings/`; API error
  classes/mapping live under `server/errors/`. Existing SEC contracts are reused. No casts, additional packages, Docker
  files, or nock integration were added. Docker/nock remain a discussion after T03 review, not committed future scope.
- **Red → green:** Six listing unit tests and the initial 26 HTTP cases failed before implementation. Three further query
  edge cases were also confirmed failing before validation. Adversarial review reproduced a malformed Unicode filename:
  it threw `URIError` and returned 500 instead of 502. Added a failing schema assertion and HTTP regression, then rejected
  lone surrogates at the SEC schema boundary while retaining valid emoji filenames. Final result: 17 unit, 1 React, and
  44 integration tests pass (62 total). Eight redundant server setup assertions were retired, with their startup/static
  checks retained in acceptance. No tests were added solely for configuration or file layout.
- **Quality/build:** `bun run typecheck`, `bun run check`, `bun run check:unused`, `bun run test`, and `bun run build` pass
  with the pinned runtimes. No lockfile/dependency change was needed.
- **Acceptance:** Compiled the real Express app and SEC adapter together under Bun, with only SEC traffic directed to a
  local HTTP fixture server. Verified global filtering/order/pagination, archived documents, empty/beyond-end results,
  400 before fetching, unmapped 404, oldest-archive 502 with no partial data, retry recovery, shared-cache reuse, and a real
  stalled upstream request returning 504 after about 10.2 seconds including pacing. Eight local upstream requests and no
  live SEC requests were made. Separately, `PORT=3100 bun run start` served health, HTML/JS assets, and the new route's
  invalid-query 400 without contacting SEC. All three local servers were stopped; the frontend is unchanged.
- **Adversarial review:** Confirmed cache immutability, safe handling of huge page values, exact forms, deterministic
  ties, query validation before network calls, explicit complete-history failure, and error translation outside the SEC
  transport. Fixed the Unicode defect above. Reviewed the new module boundaries, test scope, and documentation; no
  unresolved local defect identified. Live compatibility and opening actual documents remain unverified pending identity
  approval. Rejecting unknown query parameters is the documented default proposed while awaiting your preference.
- **Time checkpoint:** About 20 minutes for T03 implementation, regression review, and local verification. The notes
  record roughly 20 minutes for T01 and 20 minutes for initial T02, plus its later refactor/review work. Review pauses were
  not precisely timed. No substantial overrun of the four-hour implementation budget is established; prioritize T04 and
  T05 next, and keep Docker/nock outside the current scope until discussed.

### 2026-09-09 — T03 security follow-up

- **Scope:** Added pinned Helmet 8.3.0, a small header policy and request guard under `server/security/`, a separate
  request-limit error class, and shared error codes. Explicitly selected the simple query parser; preserved domain Zod
  validation. Added the security assessment above; logging, CSRF tokens, a rate limiter, Docker, and nock were not added.
- **Red → green:** Five HTTP cases failed first on missing headers or accepting oversized URLs/framed bodies. Added
  boundary/body cases and assertions to existing success/error cases, then implemented the controls. Three adversarial
  parameter-pollution variants (encoded duplicate name and prototype-style keys) confirmed existing rejection behavior.
  Current totals: 17 unit, 1 React, 50 integration tests (68 total). No separate setup/configuration tests were added.
- **Checks:** Type checking, Biome, knip, all tests, and build pass. `PORT=3100 bun run start` served the built page, JS,
  CSS, and API locally. Browser inspection found the rendered React heading/content and no recorded warnings/errors,
  confirming that the CSP permits the current built UI.
- **Acceptance:** Repeated compiled-app SEC-fixture acceptance: complete history, global filter/order/pagination, cache
  reuse, failure/recovery, and real timeout (about 10.2 seconds) all passed. Separate checks against production start
  verified headers, encoded duplicate keys, URL rejection, fixed/chunked/empty-chunked body rejection, connection close,
  and acceptance of Content-Length: 0 and HEAD health. No live SEC request or external identity transmission occurred.
  Local acceptance servers and the temporary browser tab were closed; frozen-lockfile installation also passed.
- **Adversarial review:** Checked middleware ordering (including errors/static files), query pollution before upstream
  work, body framing without buffering, URL boundary behavior, generic internal errors, and CSP/local-HTTP compatibility.
  A guarded request can still consume socket resources before/after admission; this is not comprehensive DoS protection.
  Documented missing inbound limits, queue/deadline bounds, telemetry, and deployment controls rather than marking them
  complete. Reviewed the lockfile scope, source separation, and prompt/roadmap alignment. No additional local regression
  found; the documented security gaps remain open.

### 2026-09-09 — T03 CORS and manual live acceptance

- **Implementation:** Pinned cors 2.8.6 and @types/cors 2.8.19. The origin policy lives in `server/security/cors.ts`,
  its error class in `server/errors/cors.ts`, and startup injects allowed origins. Configuration schemas moved into
  `server/schemas/config.ts`; CLIENT_PORT is validated with the existing port schema. The proposed local origins are
  the current scope while awaiting any additional-origin requirement; no deployment-specific origins were invented.
- **Red → green:** Seven CORS cases failed before implementation. Adversarial review then reproduced missing
  Vary: Origin on absent/rejected origins in five existing cases. Fixed it before invoking the cors middleware, including
  denied requests. All 75 tests pass: 17 unit, 1 React, 57 HTTP integration. External SEC responses are stubbed throughout.
- **Quality and local acceptance:** Type checks, Biome, knip, tests and build pass. Production start and development
  startup both pass. Local HTTP acceptance verifies their distinct origin lists, CLI requests without Origin, approved
  error responses, null/lookalike rejection, preflights, and request limits before preflight completion. POST and
  Authorization are not granted by preflight headers. The built React page renders with no recorded browser errors or
  warnings. Compiled-app fixture acceptance again passes complete history, sorting/filtering/paging, failure/recovery,
  cache reuse, and the real ten-second upstream timeout.
- **Manual live checks — outside tests/CI:** You authorized a dummy email. A temporary SEC_USER_AGENT override of
  `Quatr Assignment acceptance@example.com` was used; `.env` and its real identity were untouched. The built API returned
  complete histories, ascending oldest pages, exact 10-K filtering, and empty beyond-end pages for all three companies;
  an unknown ticker returned 404. Each selected original document returned HTTP 200 with HTML content. Retrieval was
  over HTTP using the dummy identity, not browser navigation. Interactive document-link acceptance remains T05/T06.

| Company | Total filings | Oldest / newest filing date | Latest exact 10-K | Selected document HTTP |
| --- | ---: | --- | --- | --- |
| AAPL | 2,246 | 1994-01-26 / 2026-09-03 | 2025-10-31 | [200](https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm) |
| SPOT | 372 | 2015-06-12 / 2026-09-03 | None | [200](https://www.sec.gov/Archives/edgar/data/1639920/000114036126035603/xslF345X06/form4.xml) |
| JPM | 166,503 | 1994-01-20 / 2026-09-09 | 2026-02-13 | [200](https://www.sec.gov/Archives/edgar/data/19617/000162828026008131/jpm-20251231.htm) |

These observations are from 2026-09-09, not fixed test expectations or a freshness guarantee. The first manual adapter
probe stopped JPM at its own 60-request cap; this was not an SEC rejection. Metadata showed 70 references, and the later
built-endpoint check completed all of them in about 14.5 seconds. This resolves the earlier identity-related blocker for
these checks without transmitting the real contact identity.

- **Adversarial conclusion:** Fixed the Vary omission. Checked exact origin comparison, lack of credential/wildcard
  grants, header presence on failures, preflight guard ordering, and origin-less CLI compatibility. No additional local
  regression identified. Spoofable/absent Origin headers do not establish caller trust; inbound rate/queue limits and
  safe operational logging remain the documented gaps. No live script or dependency on external availability was added
  to automated tests, package test scripts, or CI.
- **Handoff:** Frozen-lockfile installation and documentation-link checks pass. All temporary application/fixture servers
  and the browser acceptance tab were closed. Changes remain staged without a commit.

## Remaining work and completion notes

- T00–T02 are merged. T03 implementation, deterministic tests, quality checks, and local acceptance pass; its changes await
  staged review and separate commit/PR authorization. Manual live SEC acceptance now passes; automated tests remain fixture-only.
- The earlier automatic approval block concerned the real contact identity in `.env`. You subsequently authorized a dummy identity. Manual live checks used a temporary SEC_USER_AGENT override with an example.com email; the real value was neither changed nor sent. No live check was added to tests or CI.
- Next after T03 review: T04 summary, T05 UI, T06 final acceptance, N01 final edge-case notes, and T07 final documentation
  alignment. Discuss Docker and nock before deciding whether either warrants a later task.
