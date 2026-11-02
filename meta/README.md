# meta/ — documentation about this repo

Nothing in this folder is part of the published guide; the site build ignores it. It records how the guide was made, the evidence behind its claims, and the reusable spec it was made from.

| Path | What it is |
|---|---|
| [`CLEANROOM_SPEC.md`](CLEANROOM_SPEC.md) | **The reusable piece.** A portable specification for building this kind of onboarding-guide site for *any* codebase: product, architecture, design system, authoring traps, interactivity rules, verification, hosting and a build plan. It contains no source code and nothing specific to Umami. This is the **revised** version, with every gap from the test run folded in. |
| [`build-run/BRIEF.md`](build-run/BRIEF.md) | The exact task brief given to the Claude Code session that built the guide: scope, hard constraints (no git, no GitHub, no deploys, Umami read-only), and the report it had to write. |
| [`build-run/CLEANROOM_SPEC.v1.md`](build-run/CLEANROOM_SPEC.v1.md) | The spec **as it stood during the run**. The section numbers cited in the report refer to this version. |
| [`build-run/EVAL_REPORT.md`](build-run/EVAL_REPORT.md) | The session's own report: what it built, the evidence for each widget's default value, verification numbers, 19 items of feedback on the spec (F1–F19), and its deviations from the spec. |
| [`verify/`](verify/) | The standalone Node checks used to confirm widget values, plus three verification screenshots. |

## How the guide was produced

1. **Spec.** I wrote the method up as a clean-room spec ([`build-run/CLEANROOM_SPEC.v1.md`](build-run/CLEANROOM_SPEC.v1.md)) with no source code and no reference to any particular codebase.
2. **Blind build.** A fresh, headless Claude Code session started in an empty directory with three things: the spec, the brief, and a read-only clone of Umami at commit `559e3c6` (v3.4.1). It had no other context and no knowledge of how the method was first developed. It researched Umami, built the site, verified it, and wrote [`build-run/EVAL_REPORT.md`](build-run/EVAL_REPORT.md).
3. **Independent check.** The build was re-run (8 pages from 8 sources) and both widget-default scripts were re-executed by hand. The `alice → paidAds` assertion was confirmed in Umami's `tests/api/revenue.spec.ts`.
4. **Spec revision.** All 19 feedback items were folded into [`CLEANROOM_SPEC.md`](CLEANROOM_SPEC.md). The main changes:
   - an evidence ladder for widget values when no database exists;
   - a "spine" alternative for central entities that have no lifecycle;
   - a base path read from the environment, for PR previews;
   - a favicon in the base layout, so the "no console errors" check can pass;
   - the code-block background set inline by the syntax highlighter;
   - a contrast audit that also covers form inputs and opacity;
   - edge cases in the directory-tree renderer;
   - extra acceptance checks.
5. **Kept.** The generated site was moved, unchanged, into this repo (the only edit was one path in a verify script), together with this meta folder.

### Verification results from the run

| Check | Result |
|---|---|
| `npm run build` | 8 pages from 8 source files |
| Dark-mode contrast audit (< 3.0), 1280px and 390px, every widget state | 0 failures on every page |
| Light-mode audit | 0 failures |
| Horizontal overflow at 1280px and 390px | 0 on every page |
| Internal links / anchors | 146 links, 55 anchors, 0 broken |
| Requests to other origins | 0 |
| Widget assertions (defaults, branches, slider bounds, styling of JS-created nodes) | 56 / 56 passed |
| Build under a PR-preview base path | assets load, navigation and widgets work |

## Re-running the checks

The scripts need only Node; they don't depend on an Umami checkout.

```sh
TZ=UTC node meta/verify/session-id.mjs   # → sessionId 42656d85-a38f-5f46-b6ed-93af87a2c775
node meta/verify/channel-check.cjs       # runs the shipped src/widgets/channel-logic.js over the presets
node meta/verify/channel.mjs             # the earlier standalone port of the channel CASE
```

`session-id.mjs` is an independent re-implementation of the session-id widget's logic. Its default output should equal the widget's default. `channel-check.cjs` loads the exact file the page inlines and prints each preset's channel in all four copies of the rule. The persona `alice` must come out `paidAds` everywhere.

## Reusing the spec

To build the same kind of guide for another codebase, give [`CLEANROOM_SPEC.md`](CLEANROOM_SPEC.md) to a person or a coding agent along with that codebase. Using [`build-run/BRIEF.md`](build-run/BRIEF.md) as a template brief worked well: it fixes the scope, the constraints, and a report with mandatory spec feedback. The feedback section is what improved the spec.
