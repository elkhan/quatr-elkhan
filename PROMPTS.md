# AI prompt log

This log records user-authored project instructions, prompts, and clarifications for the assignment's AI-use disclosure. Entries preserve the original wording, including typos; incidental trailing whitespace is removed. Append subsequent prompts and answers in order before each handoff. Do not invent missing history; redact secrets explicitly if any appear in a future prompt.

Assistant: OpenAI Codex. Work so far: read the local assignment and its linked SEC documentation, clarify scope, and prepare planning documents. No application implementation has started.

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

And before the handoff do an advesarial review of you changes.
```

## 004 — 2026-09-09 — Approval and publication

```text
I approve. Commit, push and open a PR - https://github.com/elkhan/quatr-elkhan
```
