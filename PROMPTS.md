# AI prompt log

This log records user-authored project instructions, prompts, and clarifications for the assignment's AI-use disclosure. Entries preserve the original wording, including typos; incidental trailing whitespace is removed. Append subsequent prompts and answers in order before each handoff. Do not invent missing history; redact secrets explicitly if any appear in a future prompt.

Assistant: OpenAI Codex. T00 planning and T01 project setup/CI were reviewed and merged by the user. T02 SEC history retrieval and its structural refactor were reviewed and published in [PR #3](https://github.com/elkhan/quatr-elkhan/pull/3), including the requested tradeoff notes and final-docs task. Live SEC checks await separate approval to use the configured contact identity.

## 001 — 2026-09-09 — Repository instructions

The user supplied the following AGENTS.md instruction:

```text
## User Preferences

- Never create draft pull requests. Create normal ready-for-review PRs unless the user explicitly asks for a draft.
```

## 002 — 2026-09-09 — Initial task

```text
I want you to read through the assignment, create a roadmap markdown file with trackable tasks that would include description, acceptance criteria and edge cases to look out for. Every task results in a PR that I review. You don't merge anything.
Every task if it is an implementation needs corresponding test or tests covering implementation - red/green (TDD). Edge cases must be covered and documented.
We should have unit and integration tests.
If in doubt always ask my opinion.
We start with setting up the project - TS, React, Express (I am more familiar with it), zod, Vitest. You can use Bun, Biome and knip. Code quality isn't optional.
YAGNI, no bloat.
Don't commit, I will review staged changes first.
Validate that build and start pass before handoff. Acceptance testing is a must post non document related changes
Be specific but concise when it comes to instructions in README.md - bun installations,
I will read through the tasks before we start. So go ahead and create the roadmap with tasks. Don't overengineer, time is limited.
Create PROMPTS.md and start logging my prompts per the assignment instructions.
We should also have a separate entry in NOTES.md listing edge cases we discovered and our reasoning. Add this as a separate ongoing task.
```

## 003 — 2026-09-09 — Scope answers and review requirement

Context: the assistant asked whether to include referenced historical files, whether latest 10-K spans all history or only the counting window, and whether to accept a ticker-mapping limitation or add CIK input.

```text
1. Full history, including referenced files
2. Latest across history
3. Ticker input with a clear lookup limitation

I don't have exact product requirements but these are my assumptions. Do you have any concerns? Be critical

And before the handoff do an adversarial review of you changes.
```

## 004 — 2026-09-09 — Approval and publication

```text
I approve. Commit, push and open a PR - https://github.com/elkhan/quatr-elkhan
```

## 005 — 2026-09-09 — Begin project setup

```text
The first PR is merged. I am aware of your concerns feel free to bring them up during implementation if necessary. Continue asking when in doubt. Move on now
```

## 006 — 2026-09-09 — GitHub CI

```text
Add GH CI workflow
```

## 007 — 2026-09-09 — Begin SEC retrieval; focus testing on business behavior

```text
Committed and merged. Move on to the next task.
I know this is not a production system but we should stil follow proper conventions where it makes sense - delivery is the main goal not perfect code or structure.
Don't over test, setup integration test was redundant. It has to cover business logic not setups/configs.
```

## 008 — 2026-09-09 — Refactor structure; explain before editing

```text
Move zod validations into separate files per domain.
The same with Error classes.
I am not happy with the current code structure where everything is lumped together.
Split into manageable/reviewable functions/code blocks.
Avoid casting, have reusable types' files
Fixtures belong in tests
Avoid inline ternaries
Refactor src/server/sec/client.ts per my suggestions. I asked you to follow conventions that includes code structure.

Let me know if you are following, share your understandiung before writing code. How would you refactor this file?
```

## 009 — 2026-09-09 — Domain directories and maintainability

```text
It is okay to have ternaries but extract them for readability. src/server/sec/client.ts is not readable at all.
It is fine to have filenames express the intentions like company.schemas or sec.errors another option is a directory - errors, schemas etc. Depends on collocation options. If too many schema or errors related files it may make sense to have a dedicated directory.
Have a schema directory with schema files.
The same with errors and types. Consider maintainability and flexibility, avoid coupling.

Make sure that code structure is one of your priorities.

Does it make sense? Please be critical. Despite this being a test, I still want to see clear separation and maintainability addressed
```

## 010 — 2026-09-09 — Publication approval, tradeoffs, and final documentation task

```text
Reviewed, you can commit and push, create a PR.

I think it would make sense to document in NOTES.md  the limitations of the current caching approach in case of horizontal scaling.

And the currently accepted tradeoffs. Add a task for the final docs alignment
```
