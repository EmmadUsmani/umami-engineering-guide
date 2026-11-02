# Task: apply a clean-room spec to an open-source project

You are evaluating a specification by following it. Work only inside this directory.

- `./CLEANROOM_SPEC.md` — the spec. It is your ONLY source of instructions for what the site is and how to build it. Read it fully first.
- `./target-src/` — the target codebase (Umami, an open-source web analytics app). Read-only: do not modify it, do not install its dependencies, do not run it.
- `./docs-site/` — create the docs repo here, following the spec.

## Scope for this evaluation
- Shell + design system + hub page + the four foundation pages (data model, architecture components, architecture flows, codebase overview) + 2–3 deep dives of your choosing. At least two interactive widgets across the deep dives, each reproducing real logic from target-src with a default state that reproduces a real, verified value (no live DB exists — derive verified values from target-src's own code, tests, fixtures or seed data; you may run small standalone Node scripts that re-implement or copy-in a pure function to confirm a value, but don't install target-src deps).
- The authoring guide (AGENTS.md / CLAUDE.md), README, and both GitHub workflow files (written, never run).

## Hard constraints
- Do NOT create a GitHub repo, push, deploy, open PRs, or use `gh`. Do NOT run any git commands at all (no git init, no commits) — the orchestrator handles version control.
- No network access other than `npm install` in ./docs-site.
- Do not read files outside this directory (no other projects in the home directory).
- Follow the spec's verification section: clean `npm run build`, then verify in a headless browser (the `playwright-isolated` MCP tools if available, via `npm run preview`), including the dark-mode contrast audit, overflow at 390px, nav drawer, theme toggle, link/anchor check, and programmatic widget assertions. Stop any servers you started before you finish.

## Deliverable at the end
Write `./EVAL_REPORT.md` containing:
1. What you built (page list, widgets, and the real value each widget's default reproduces + where it came from).
2. Verification results with numbers (build page count, contrast failures per page, overflow, link check, widget assertions).
3. **Spec feedback** — every place the spec was ambiguous, missing information, contradictory, or where you had to guess; each with a suggested fix to the spec. Be specific and critical; this is the main point of the evaluation.
4. Deviations from the spec and why.
