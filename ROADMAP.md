# Assignment roadmap

Status: **T00–T03 reviewed and merged by you; T04 is published for review in [PR #5](https://github.com/elkhan/quatr-elkhan/pull/5). Manual live SEC checks pass with the authorized dummy identity; automated tests remain fixture-only.**

Build a TypeScript, React, and Express application that resolves SEC tickers, lists their complete filing history with
pagination and form filtering, and summarizes filings across companies. The UI supports company selection, form
filtering, date sorting, and summaries.

The assignment targets about **four hours including setup**. Full history, TDD, acceptance checks, and individual PR
reviews make this tight. Keep the required scope; add no extensions. Check time after T03. If substantially over budget,
stop and document missing work and how to finish it in NOTES.md, as the assignment requests.

## Working agreement

- Review this roadmap before starting T01. Ask your opinion when requirements or tradeoffs are uncertain.
- Each numbered task produces one normal, ready-for-review PR. No draft PRs. You review each PR; the assistant never
  merges.
- Before any commit, stage only that task's changes for your review. **Do not commit or push until you explicitly
  authorize it after reviewing the staged changes.** PR creation follows that authorization. Track the eventual PR link
  below.
- Implementation follows **red → green → refactor**: write a meaningful failing behavior test, confirm the intended
  failure, implement the minimum, then refactor with tests green. Record the failing and passing commands/results in the
  handoff. Add regression tests for discovered defects.
- Focus tests on business behavior, not setup/configuration. Use unit tests for pure filing logic and integration tests
  for the SEC adapter and API boundaries, stubbing SEC traffic. Inject unexpected client failures when checking the
  HTTP error contract. Once endpoints exist, exercise real Express
  requests; UI tests exercise user interactions with controlled API responses. Avoid redundant checks and keep automated
  tests and CI isolated from every live API. Manual live acceptance is separate and never enters test scripts.
  Verify build/start through acceptance rather than extra setup test suites.
- Every implementation PR covers its documented edge cases. Each applicable NOTES.md entry links to the actual test once
  written; uncovered cases remain explicitly open. Do not mark work complete with silently deferred edge coverage.
- Before every non-documentation handoff: run type checking, Biome, knip, unit/integration tests, a production build,
  and the built application's start command. Perform feature acceptance testing against the running application. Browser
  changes require browser acceptance testing. Record results and disclose any blocked checks; a blocked check is not a
  pass.
- Before every handoff, perform a **deep adversarial review of the actual diff**: challenge requirement coverage, failure
  paths, test blind spots, unnecessary complexity, and misleading documentation. Fix findings and rerun affected checks;
  report unresolved concerns.
- Code structure is a review priority: use named operations and clear domain boundaries. Collocate `schemas/`, `errors/`,
  and `types/` within their owning domain; put fixtures in tests. Derive external-data types from schemas, avoid casts,
  and extract complex expressions for readability. Keep HTTP/cache concerns independent of company and filing rules.
  Routers register handlers; domain controllers coordinate validated input, services, and HTTP responses. Keep services
  independent of Express and test observable behavior at the HTTP boundary.
- Keep PROMPTS.md current with user prompts and follow-up answers. Maintain edge cases and reasoning through N01
  throughout implementation.

Task-tracker checkboxes record PRs accepted by you. Outstanding validation limitations remain explicitly documented;
they do not become passes when a PR is merged. T03 is complete through [PR #4](https://github.com/elkhan/quatr-elkhan/pull/4); T04 remains open until its PR is reviewed. No checkbox authorizes merging.

## Scope decisions

Confirmed by you on 2026-09-09 as working assumptions, rather than definitive product requirements:

1. Include full history from the main submissions response and every referenced historical file.
2. Find the latest `10-K` across that history, independently of the 12-month counting window.
3. Accept ticker input, with a clear limitation when SEC's ticker directory has no mapping. No CIK fallback in this
   scope.

Implementation defaults approved with this roadmap; revisit uncertainties with you:

- Use one repository/package: React with Vite, Express, strict TypeScript, Zod at external boundaries, and Vitest. Use
  Bun for installation/scripts, Biome for formatting/linting, and knip for unused code/dependencies. Avoid a database,
  authentication, background jobs, and a generic service framework.
- Serve the built UI and API from Express; use Vite's API proxy during development. Keep SEC requests on the backend.
- `GET /companies/:ticker/filings?page=1&pageSize=25&form=10-K&sort=desc`: default page 1, page size 25 (maximum 100),
  newest first. Optional exact form match; accept other valid form strings. Filter, sort the full result, then paginate.
  Return company identity, filing items, page, page size, and the filtered total. Use accession number to break date
  ties consistently.
- `GET /filings/summary?tickers=AAPL,SPOT,JPM`: require 1–10 unique tickers after trimming, uppercasing, and
  deduplication. Return the effective UTC date window and one result per ticker in first-requested order. Each
  successful result has counts by exact form and `latest10KDate`, which may be `null`. A company's lookup/upstream
  failure is explicit on its result; never report it as zero filings. Invalid overall input returns 400.
- Count by **filing date**, including both the UTC date 12 calendar months before today and today; exclude future dates.
  Clamp February 29 to February 28 when the prior year is not a leap year. Keep `10-K/A` separate from `10-K`; do not
  substitute `20-F` or another annual form for a missing `10-K`.
- Both endpoints return 400 for invalid overall input. The single-company filings endpoint returns 404 for an unmapped
  ticker, 502 for upstream/data failure, and 504 for timeout. Valid summary batches return 200 with explicit per-company
  results/errors, even if every company fails. Full-history fetches fail explicitly if a required archive cannot be
  read; partial history must not be labeled complete.

See [NOTES.md](NOTES.md) for evidence, edge cases, and known constraints.

## Task tracker

Follow T00–T07 in order; finish N01's final notes before T07's cross-document review. Replace each PR placeholder with
its link when created.

- [x] **T00 — Roadmap and assignment logs.** Reviewed and merged by
  you. [PR #1](https://github.com/elkhan/quatr-elkhan/pull/1).
- [x] **T01 — Project setup and runnable skeleton.** Reviewed and merged by you.
  [PR #2](https://github.com/elkhan/quatr-elkhan/pull/2). CI passed on merged `main`; redundant configuration/startup
  tests remain removed in line with your testing guidance.
- [x] **T02 — SEC lookup and complete normalized history.** Reviewed and merged by you. Deterministic checks passed;
  manual live SEC history/document checks subsequently passed with the authorized dummy identity; T06 will repeat final feature acceptance.
  [PR #3](https://github.com/elkhan/quatr-elkhan/pull/3).
- [x] **T03 — Paginated, filterable filings endpoint.** Implemented with HTTP security controls; 75 total tests, quality checks, build/start, and
  compiled-app local HTTP acceptance pass. Reviewed and merged by you as [PR #4](https://github.com/elkhan/quatr-elkhan/pull/4); GitHub CI passed.
- [ ] **T04 — Multi-company summary endpoint.** Implemented with explicit controllers for both APIs; 104 tests and required checks pass. Staged changes approved and published for PR review. [PR #5](https://github.com/elkhan/quatr-elkhan/pull/5).
- [ ] **T05 — Filing browser and summary UI.** Not started. PR: pending.
- [ ] **T06 — End-to-end acceptance and run instructions.** Not started. PR: pending.
- [ ] **T07 — Final documentation alignment.** After T06 and N01, or at the time-budget stop. PR: pending.
- [ ] **N01 — Ongoing edge-case reasoning and final notes.** Starts now; closes after T06 or the time-budget stop. Final
  documentation PR: pending.

### T00 — Roadmap and assignment logs

**Description:** Translate the assignment and your instructions into reviewable work before writing application code.

**Acceptance criteria:** ROADMAP.md covers every required API/UI behavior and the review workflow; PROMPTS.md contains
the prompts and decisions so far; NOTES.md distinguishes confirmed choices, proposed behavior, and unimplemented
coverage. Changes are staged for your review without a commit.

**Validation / edge cases:** Check the plan against both assignment pages, including prompt logging, run instructions,
the time limit, and missing-work notes. Resolve the conflict between eventual GitHub submission and the current
no-commit instruction by leaving publication gated on your authorization. No build/start or runtime acceptance checks
apply to this documentation-only task.

### T01 — Project setup and runnable skeleton

**Description:** Establish the requested stack and quality checks with the smallest runnable React/Express application.

**Acceptance criteria:**

- [x] Add GitHub CI for PRs and pushes to `main`, using the project's runtime versions, frozen lockfile, quality checks,
  unit/React tests, HTTP integration tests, and production build. Workflow syntax is validated locally;
  [CI passed on merged main](https://github.com/elkhan/quatr-elkhan/actions/runs/34370626478).

- [x] TypeScript is strict; React, Express, Zod, and Vitest are wired up with Bun, Biome, and knip. Include the
  dependency lockfile in staged changes; avoid unused scaffolding and blanket lint/type suppressions.
- [x] Provide scripts for development, type checking, formatting/lint checking, unused-code checking, unit tests,
  integration tests, all tests, production build, and production start. Checks fail on errors; required test suites
  cannot pass empty.
- [x] React renders a minimal page, Express exposes a health endpoint, and production start serves the built page and
  API. Validate port and required SEC User-Agent configuration with Zod; provide a placeholder-only `.env.example`.
- [x] README.md gives concise, exact instructions: install the tested Bun version, `bun install`, configure the
  environment, run development, run checks, then build/start. State whether Node is also needed by the chosen toolchain,
  with a tested version if so.

**Validation:** Setup was verified through tests and runtime acceptance. You subsequently removed the redundant
configuration/startup tests and clarified that new automated tests must focus on business behavior. Build/start
acceptance remains required; the historical checks are recorded in NOTES.md.

**Acceptance:** Follow README.md from a clean dependency install; verify all scripts, successful build, and built-app
start. Open the page and call the health endpoint. Check missing configuration and a port conflict fail clearly. Record
the tested commands and versions.

### T02 — SEC lookup and complete normalized history

**Description:** Resolve arbitrary directory-listed tickers, retrieve recent and referenced historical submissions, and
produce filing objects with original SEC document links.

**Acceptance criteria:**

- [x] Normalize ticker whitespace/case while preserving meaningful punctuation. Resolve CIK through SEC's directory and
  zero-pad submissions CIKs to 10 digits. Do not hardcode the assignment's example companies.
- [x] Parse the required external fields with Zod, tolerate unrelated extra fields, and align columnar rows correctly.
  Load every referenced historical file, deduplicate by accession number, and handle the historical payload's shape
  separately from the main response.
- [x] Each filing has accession number, form, filing date, and an original-document URL. A missing/blank
  primary-document filename or absent optional document column links to the original complete submission text; a present
  but misaligned column is invalid. Document this fallback.
- [x] Supply the configured User-Agent, a finite timeout, and shared request pacing below SEC's published limit. Use
  small in-memory reuse for repeated ticker/company reads with an explicit expiry; do not cache failures or add
  persistent storage. Concurrent callers share identical in-flight fetches.
- [x] Unknown tickers, malformed data, SEC rejection/rate limiting, timeouts, and failed archive reads are
  distinguishable errors. Do not silently truncate history or automatically retry without bounds.

**Red/green tests and edge cases:** Unit-test ticker/CIK conversion, row normalization, URL generation, and
deduplication. SEC-adapter integration tests use representative main/archive fixtures and assert request URLs, headers,
pacing, cache expiry, and timeout/failure behavior. Cover empty history, unequal/missing required columns, invalid
dates, absent primary documents, unexpected extra fields, punctuation in tickers, overlapping files, and duplicate
concurrent requests. See E01–E05 and E11 in NOTES.md.

**Acceptance:** Run the fixture-backed client against a company whose relevant filing exists only in an archive, and
verify no rows are lost or duplicated. Make a limited live lookup/history check for Apple, Spotify, and JPMorgan Chase
using an explicitly authorized identity, separate from automated tests; record access failures honestly.

**Current evidence:** Unit/integration tests, local HTTP fixture acceptance, and build/start pass. Manual live history and
source-document HTTP retrieval passed for all three companies with the authorized dummy identity; see NOTES.md.

### T03 — Paginated, filterable filings endpoint

**Description:** Expose complete history through `GET /companies/:ticker/filings` using the proposed contract above.

**Acceptance criteria:**

- [x] Validate path/query input; return normalized company identity, filing objects, and accurate filtered pagination
  metadata.
- [x] Support optional exact form filtering and ascending/descending filing-date sorting across the complete result
  before pagination. Same-date results have deterministic ordering.
- [x] Empty results and a page beyond the last page return an empty list and correct total. Input and upstream failures
  use consistent JSON errors and appropriate HTTP statuses.
- [x] Security follow-up: apply Helmet, bound URLs/reject bodies before SEC work, and preserve strict query pollution
  checks. Document sensitive-data logging, CSRF/CORS, inbound rate limits, and deployment gaps in NOTES.md.

**Red/green tests and edge cases:** Unit-test filtering, ordering, and page calculations; integration-test real Express
requests with only SEC responses stubbed. Cover defaults, both sort directions, `10-K` versus `10-K/A`, another form
such as `20-F`, no matches, same-day filings, last/beyond-last pages, zero/negative/fractional/non-numeric/unsafe page
values, excessive page size, repeated scalar query parameters, unknown ticker, timeout, and failed archive retrieval.
Ensure an archived filing appears on the correct page. See E06–E07 and E11.

**Acceptance:** Build/start, then exercise filtering, sorting, page boundaries, an unknown ticker, and an archive
failure over HTTP. Confirm a returned original-document link opens on sec.gov.

**Current evidence:** Six listing unit tests and 43 real-HTTP route cases pass; a reproduced malformed-Unicode filename
defect also has a SEC schema regression test. All 75 tests and required local checks passed at T03 completion. Compiled-app acceptance covered
filtering, ordering, paging, invalid input, unknown ticker, archive failure/recovery, and a real request timeout. Live SEC
history checks and source-document HTTP retrieval now pass with the authorized dummy identity; interactive UI navigation
remains T05/T06. Unknown query parameters currently return
400, as proposed while awaiting your preference. The security follow-up additionally verified headers, URL/body rejection,
query pollution, explicit CORS origins/preflights, and the built UI under CSP; security gaps and validation evidence are
recorded in NOTES.md.

**Deferred discussion:** Docker packaging and nock can be considered after these routes are reviewed. Neither is part of
T03, and no implementation task or dependency is added until that discussion.

### T04 — Multi-company summary endpoint

**Description:** Expose counts per form over the last 12 months and the latest exact 10-K across history.

**Acceptance criteria:**

- [x] Implement the proposed summary query, date-window rules, deduplication, and per-company result/error contract.
  Reuse T02 rather than fetching through the paginated endpoint.
- [x] Counts include all exact form types found in the window. No recent filings yields empty counts; no historical
  exact 10-K yields `null`. An older 10-K remains eligible for `latest10KDate`.
- [x] Mixed success/failure is visible for each requested ticker; all-company failure also remains explicit. Respect the
  shared SEC request pacing across concurrent API requests.
- [x] Extract controllers for both endpoints; keep routers limited to registration and verify unexpected failures at
  the HTTP boundary without exposing internal diagnostics.

**Red/green tests and edge cases:** Unit-test aggregation with a fixed clock: inclusive cutoff, today, one day outside
either boundary, future dates, leap-day clamping, amendments, no filings, no 10-K, and a latest 10-K found only in an
archive. Integration-test multiple companies, duplicate/case-varied tickers, missing/empty/malformed input, repeated
query parameters, the company limit, one failing company, all failing companies, and concurrent requests. See E02 and
E07–E09.

**Acceptance:** Build/start and request the three example companies together. Check fixture-backed counts and historical
10-K dates exactly; verify unknown tickers do not hide successful companies. Live counts are not fixed test
expectations.

**Current evidence:** Eight summary unit cases, 19 summary HTTP cases, and two shared HTTP error cases pass (104 tests
overall). The controller refactor preserves the existing 62 endpoint cases; unexpected-defect coverage now exercises
both controllers through real HTTP instead of a redundant service-only assertion. Build/start and
compiled-app acceptance cover exact fixture counts, archived annual dates, mixed/all failures, recovery, and cache
sharing with listings. Manual live acceptance is separate from automated tests; results are recorded in NOTES.md.
Future-dated 10-Ks remain ineligible under the implementation approved at staged review.

### T05 — Filing browser and summary UI

**Description:** Add a simple, usable React interface for both endpoints without a component framework or unnecessary
state library.

**Acceptance criteria:**

- [ ] Users can enter a ticker, switch companies, filter forms, change filing-date sort direction, page through results,
  and open original filings. The example companies can be shortcuts, but arbitrary mapped tickers work.
- [ ] Form filtering supports foreign-company and amendment forms; it is not restricted to `10-K`, `10-Q`, and `8-K`.
- [ ] A summary accepts several tickers and clearly displays counts by form, the date window, latest 10-K dates, and
  per-company errors. Missing 10-Ks display “None found.”
- [ ] Loading, empty, invalid-input, and error states are visible and allow recovery. Reset pagination when
  ticker/filter/sort changes, and prevent stale responses from replacing newer selections.
- [ ] Inputs have labels, controls work by keyboard, pagination boundaries are clear, and tables remain usable on a
  narrow screen.

**Red/green tests and edge cases:** Use Vitest and React Testing Library to test visible behavior. Cover search
submission, filtering/sorting requests, pagination reset/boundaries, original links, loading/empty/error/retry states,
mixed summary results, missing 10-K, and out-of-order responses for both filing and summary requests. Test pure UI
transformations separately only where they contain meaningful logic. See E06–E10.

**Acceptance:** Build/start and use the browser to complete filing and summary flows with fixtures, including a slow old
response followed by a new selection and a failed request followed by recovery. Check keyboard operation and
narrow-screen layout; repeat the main flow with live data where available.

### T06 — End-to-end acceptance and run instructions

**Description:** Verify the assembled application and make the submission reproducible. This supplements acceptance
testing in every earlier implementation PR.

**Acceptance criteria:**

- [ ] Add a small automated browser acceptance suite using the real React UI and Express backend with only SEC traffic
  controlled. Cover ticker → filter/sort → pagination → document link, plus summary success/partial failure and an empty
  state. Use a browser test runner only for these cross-application checks; keep unit/integration tests in Vitest.
- [ ] Any missing end-to-end behavior or regression gets a failing test before a fix. Do not break working code merely
  to manufacture a red result for a new acceptance test.
- [ ] From a clean install, all quality/test checks and the production build pass; the production start command serves
  the working application. Record browser acceptance and limited live checks for the example companies, including
  opening an original filing.
- [ ] README.md contains verified Bun installation/setup/run/check/build/start commands, environment requirements,
  endpoint/query examples, and links to limitations and notes. Keep instructions short and executable.
- [ ] Adversarial review findings are fixed or explicitly reported with their impact; submission gaps are visible in
  NOTES.md. No extension work is added.

**Tests / edge cases:** Validate that the browser uses the real API, production assets resolve, and unknown API paths do
not return HTML. Exercise a mapped ticker beyond the shortcuts with a fixture, a foreign annual form, historical data,
failure recovery, and the unsupported-ticker message. Live SEC unavailability must be reported as a blocked live check,
not disguised with fixture results.

### T07 — Final documentation alignment

**Description:** Reconcile README.md, ROADMAP.md, NOTES.md, and PROMPTS.md with the delivered code, accepted decisions,
and actual validation evidence. This final documentation PR follows T06 acceptance and N01's completed edge-case notes,
or documents the partial delivery if the assignment's time limit is reached.

**Acceptance criteria:**

- [ ] README.md matches the shipped install/run/check/build/start commands, runtime versions, configuration, implemented
  endpoints/query defaults, and available UI flows. Use T06's validation evidence; verify any changed command example.
- [ ] NOTES.md records the current accepted tradeoffs, cache/scaling limitations, remaining work, and blocked checks.
  Distinguish implemented behavior, approved future behavior, and future design options.
- [ ] ROADMAP.md task states and PR links match delivery; PROMPTS.md includes all user prompts and decisions through
  handoff. Preserve clearly labeled historical evidence while removing stale current-status claims.
- [ ] Local links, test references, example requests, and terminology agree across all four documents. No unimplemented
  endpoint, unrun live check, or multi-instance capability is presented as delivered or verified.

**Validation / edge cases:** Review docs against the final diff and acceptance log. Look for renamed/moved tests, changed
defaults, obsolete installation commands, superseded decisions, stale test counts, and partial delivery at the time stop.
Run an adversarial documentation review. Do not add setup/configuration tests for this task; any discovered code defect
gets its own implementation task with business tests and acceptance. This task produces its own ready-for-review PR.

### N01 — Ongoing edge cases, reasoning, and final notes

**Description:** Maintain the separate edge-case register in NOTES.md throughout every task, then produce a final
documentation PR reconciling the register and submission status. Feature PRs include their own new edge cases and test
links; do not postpone documenting them until the final PR.

**Acceptance criteria:**

- [ ] Each discovered case records the trigger, reasoning, chosen behavior, owning task, and coverage status/test
  reference. Distinguish user-confirmed assumptions from implementation proposals.
- [ ] Each implementation handoff updates relevant entries and logs new user prompts/answers in PROMPTS.md. Keep review
  and acceptance evidence with the owning PR/handoff.
- [ ] The final notes state remaining limitations, missing work and concrete next steps, approximate time spent, and any
  blocked validation. Do not claim unimplemented or untested behavior is complete.

**Validation / edge cases:** Check edge-case entries against actual tests, task status, and adversarial findings. A
documentation-only PR needs a document review; if code changes enter it, split those into an implementation task with
TDD and acceptance checks. This ongoing task closes through its own final documentation PR, even if the time-budget stop
leaves features incomplete.
