# Assignment notes

## Current status and scope

Planning only: no application, test suite, build, or start command exists yet. Runtime validation is not applicable to this documentation handoff. All planned test coverage below is **pending**.

The assignment targets about four hours including setup. Full history and the requested quality/review workflow put pressure on that budget. Track time during implementation; if substantially over budget, document missing work and how to finish it here. No optional extensions are planned.

User-confirmed working assumptions (2026-09-09): complete referenced history; latest 10-K across history; ticker input with a documented mapping limitation. You subsequently approved the roadmap and authorized committing, pushing, and opening its PR. Behaviors labeled “Proposal” below are the approved implementation defaults, not independently verified product requirements. See [ROADMAP.md](ROADMAP.md).

## Sources checked

- Local assignment: `Data Tooling - Coding Assignment.pdf`, both pages. Requires the two endpoints, React UI, TypeScript, run instructions, an AI prompt log, and notes on unfinished work if time runs over.
- [SEC submissions API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), checked 2026-09-09: the main response contains recent columnar history; additional files provide older history. Submissions URLs use a 10-digit CIK. Browser requests to data.sec.gov are not supported by CORS.
- [SEC data access documentation](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data), checked 2026-09-09: identifies ticker-directory coverage limits, declared User-Agent requirements, a current maximum of 10 requests/second, and archive/document path conventions.

## Ongoing edge-case register — N01

Update entries as evidence arrives. Add actual test file/test names when implemented; `pending` is not coverage. The register includes anticipated cases from the assignment and documentation, not observations from a running application.

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
| E11 / T01, T03, T06 | Missing config, port conflicts, invalid queries, and a production SPA fallback can hide failures. A Vite dev page alone does not prove production start works. | Proposal: validate config before listening; JSON errors for API paths; verify production assets and API together after every non-documentation change. | Pending: config units, HTTP validation/404 integration, build/start and browser acceptance. |

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

## Remaining work and completion notes

- T01–T06 are unimplemented. The roadmap is approved; next step after this PR review is project setup.
- No tests have been run, no build/start commands exist, and no runtime behavior has been verified.
- Before submission, replace this section with actual completed/missing work, approximate implementation time, blocked checks, and concrete steps to finish outstanding items.
