# EVAL_REPORT — applying CLEANROOM_SPEC.md to Umami

Target: `./target-src` (Umami 3.4.1, read-only, no deps installed, never run). Output: `./docs-site` (Astro 5.18.2, sole dev dependency). Scratch verification: `./verify-scripts` (standalone Node scripts and three screenshots). No git, no network beyond `npm install`, no deploys.

---

## 1. What I built

### Pages (8 source files → 8 HTML files)

| Group | Page | Accent | Highlights |
|---|---|---|---|
| — | `index` (Hub) | brand | Hero; key callout with the mental model ("a visitor is a hash, not a record") and the hit lifecycle as status pills; two card grids (foundations, deep dives) |
| Architecture & data | `data-model` | storage | Stat tiles (26 Prisma models, 26 PG migrations, 10+4 ClickHouse tables/MVs, 5 event types); domain table; `event_type` table; generated inline-SVG ERD (solid = Prisma relation, dashed = bare id column); PG vs ClickHouse comparison; typed key/value custom data |
| | `architecture-components` | platform | Layered bands map (clients → routes → libs → queries → stores); API-surface table (135 `route.ts` under `src/app/api`, 13 compat); `runQuery` excerpt; data-store table; geo-resolution steps |
| | `architecture-flows` | collect | Five step traces: page view, short-link click, login, dashboard query, share page; warning about the shared JWT secret and token `type` checks |
| | `codebase` | platform | `Tree` component directory tree; stack table; correction callout (README says Node 18.18+, CI and Docker use Node 22); 8-step `pnpm build` pipeline; commands; tests & CI |
| Deep dives | `session-identity` | identity | **Widget 1**; time-zone trap; visit rules; identify; consequences |
| | `channel-attribution` | analytics | **Widget 2**; the 12-branch CASE; six copies and how they drift; NULL vs `''`; substring over-matching; per-visit ranking |
| | `tracker-script` | collect | Narrative only (no honest widget): data- attributes, opt-outs, SPA hooks, cache-token round trip, click tracking, JS API |

Plus `AGENTS.md` (all 12 sections of spec §12), `CLAUDE.md` (pointer to AGENTS.md), `README.md`, `.github/workflows/deploy.yml`, `.github/workflows/pr-preview.yml` (written, never run), `public/{styles.css,nav.js,.nojekyll}`, `src/layouts/Base.astro`, `src/components/{Nav,Callout,Footer,Tree}.astro`, `src/widgets/{channel-logic,channel-widget}.js`.

### Widgets and the real value each default reproduces

**Widget 1 — "What session and visit id does this hit get?"** (`session-identity.html`, pattern: *recompute the real thing*)
- Ports `hash`, `uuid` (v5 over SHA-512, DNS namespace), `getSalt`, and the session/visit derivation from `src/lib/crypto.ts` and `src/app/api/send/route.ts` to Web Crypto (SHA-512 + SHA-1). Includes 50-char `distinctId` truncation and a simulation of date-fns `startOf*` running in a fixed-offset server time zone.
- Default inputs come from the fixture in `src/app/api/send/route.test.ts`: `APP_SECRET='route-send-test-secret'`, `WEBSITE_ID='11111111-1111-4111-8111-111111111111'`, ip `203.0.113.5`, UA `Mozilla/5.0`, timestamp `1704067200` (from the cache-token test), `SALT_ROTATION` month, UTC.
- **Default output:** session `42656d85-a38f-5f46-b6ed-93af87a2c775`, visit `b0d0cc61-9131-5bcd-a4a6-5720d5c646c6`.
- **How it was verified:** an independent Node re-implementation using `node:crypto` (`verify-scripts/session-id.mjs`, run with `TZ=UTC`). Its v5 step was checked against the RFC 4122 / Python reference vector `uuid5(DNS,'python.org') = 886313e1-3b8a-5372-9b90-0c9aee199e5d`. **Caveat:** the route test computes this id at run time and never hard-codes it, so no literal copy exists in the repo and I could not run Umami's own `uuid` package. This is "two independent ports agree on fixture inputs", not "matches a stored row" (see feedback F1).
- The fixture timestamp is exactly a month boundary, which exposed a real trap: on a server with `TZ=America/Los_Angeles` the same hit gets `8f2bdb44-…`, because date-fns works in the process's local time zone.

**Widget 2 — "Which channel does this visit land in — and does every report agree?"** (`channel-attribution.html`, pattern: *decision resolver*)
- Ports the channel `CASE` with SQL three-valued logic (NULL = UNKNOWN). There are four behaviourally distinct copies:
  - `getChannelMetrics` / `getChannelExpandedMetrics` on Postgres
  - the same reports on ClickHouse
  - `revenue/getRevenueMetrics` on Postgres
  - `revenue/getRevenueMetrics` on ClickHouse
- Shows the winning branch, the `paid`/`organic` prefix, and a per-WHEN trace (✓ true / ✗ false / ? NULL / – not reached).
- **Default:** API-suite persona `alice` (`tests/api/seed/dataset.ts`: referrer google.com, landing query `utm_source=newsletter&utm_medium=email&utm_campaign=launch&gclid=abc123`) → **`paidAds` in all four copies**.
- **How it was verified:** `tests/api/revenue.spec.ts:113-127` asserts alice → `paidAds`, bob → `organicSocial`, carol → `direct` against real Postgres and ClickHouse (the API suite runs on both). The exact shipped logic file is also run in Node via `vm` (`verify-scripts/channel-check.cjs`) and reproduces those three outcomes.
- The other presets come from `scripts/seed` and tracked-URL cases. Their outputs come from the port, not from a test assertion, and the widget labels them that way. They expose real disagreements:
  - the seed's own `google / cpc` row: `organicSearch` (Channels·PG) vs `paidSearch` (the other three copies)
  - `utm_medium=partner`: paid on Postgres only
  - seed rows where `NULL` ≠ `''`: email vs direct
  - revenue falls back to `Unknown` where channels falls back to `direct`
  - the `t.co` substring claims `producthunt.com`, `walmart.com`, `target.com`

---

## 2. Verification results

All runs used `npm run preview` (port 4399), the `playwright-isolated` MCP browser, and cache-busting `?v=N`.

| Check | Result |
|---|---|
| `npm run build` | **8 page(s) built**; `src/pages/` has 8 files. No errors. (npm 11 reported esbuild/sharp install scripts as not approved; the build was unaffected.) |
| Manifest | 1 dependency (`astro` ^5, dev); scripts exactly `dev`/`build`/`preview` |
| Dark-mode contrast audit (§9.3), 1280px | **0 failures on every page.** Elements audited: index 60, data-model 331, components 292, flows 291, codebase 229, session-identity 432, channel-attribution 590, tracker-script 337 |
| Light-mode audit (sanity) | 0 failures on every page |
| Dark audit at 390px | 0 failures on every page |
| Audit per widget state | Session widget: default / LA (warn verdict) / +48h (same-session verdict), each dark+light → 0. Channel widget: all 8 presets × dark+light → 0 (run twice, before and after the trace change) |
| Horizontal overflow | `scrollWidth − clientWidth` = **0 at 1280px and 0 at 390px on all 8 pages** |
| Drawer | On all 8 pages: exactly one `.active` link (tinted background confirmed); open sets `data-nav-open`, `aria-expanded="true"` and focuses the first drawer link; Escape closes, restores `aria-expanded="false"` and returns focus to the hamburger; backdrop click closes |
| Theme | OS dark with nothing stored → `dark`; OS light → `light`; toggle stores `umami-guides-theme` and the choice persists across a link navigation; an invalid stored value falls back to the OS preference |
| Links/anchors | 146 internal hrefs, 55 with `#anchors`, **0 broken**; 0 external links; every `h2` has an id and appears in its anchor list |
| Console errors | 0 after the fix. The first run had 1: the browser's automatic `/favicon.ico` request returned 404 (fixed with `<link rel="icon" href="data:,">`) |
| Requests to other origins | 0 |
| Subpath (PR-preview rehearsal) | Built with `BASE_PATH=/umami-engineering-guides/pr-preview/pr-7/` and served under that prefix: CSS and JS return 200, the top bar is styled, hub→page navigation works, and both widgets compute their defaults. The only root-absolute URLs in the HTML are the two base-prefixed assets |
| Widget assertions | **56/56 passed**, plus 8 trace and style re-checks after the "not reached" change. They cover: default values; TZ LA and Kolkata; rotation week/day; slider min (−48h → `cfa177a7…`/`9a956b46…`) and max (+48h → same session, new visit `51a0c048…`); `distinctId` user-1; 56-char id truncated (== 50-char id); every channel preset; free edits (`walmart.com`, `chatgpt.com`, NULL toggle on/off); JS-created elements got their styles (`.wrow` display grid, `.verdict.ok` background, `.chcard` radius/padding, `.chgrid` grid, `.tb-x` dashed border) |
| Cited paths | 87 unique `.path` citations. 79 exist in target-src. The other 8 are expected: 5 are gitignored build outputs (`public/script.js`, `public/recorder.js`, `geo/`, `geo/GeoLite2-City.mmdb`, `src/generated/prisma`) described as such on the page; 1 shorthand (`p/[slug]` next to its full sibling path); 1 placeholder (`src/app/api/…/route.ts`); 1 file in this docs repo (`src/widgets/channel-logic.js`) |
| Servers | Both preview servers stopped and ports 4399/4400 confirmed free; browser closed |

Two factual errors I caught in my own drafts while re-reading the code (both fixed before verification):
- I had written that the 30-minute visit window is an inactivity timeout. It is actually a cap: `iat` is carried forward unchanged.
- A key callout said "all writes" funnel through `/api/send`. That is true only for `website_event` writes; replays and heatmaps go through `/api/record`.

---

## 3. Spec feedback

Ordered roughly by how much each one cost or how risky it is.

**F1. "Real, verified value" is undefined when no database exists, and the spec quietly assumes one (§1.1, §8.2, §11.4, §13 step 7).**
Umami is open source with no dev DB here. For the session-id widget, the "real stored output" exists nowhere: the test computes it at run time. I had to decide whether "a second independent implementation agrees on fixture inputs" counts. That is weaker than a stored row (both ports could share a misreading), and the spec never says so.
*Fix:* define an evidence ladder and require the page to name its rung:
1. a value asserted literally by an upstream test or integration test
2. a row in a dev DB or seed
3. a fixture input plus an independent re-implementation, checked against a published reference vector

Ban rung 3 when the algorithm is ambiguous. Also require the widget to display its evidence rung.

**F2. The hub's "central entity and its lifecycle" (§3.2) assumes a stateful entity.**
Umami's central row (`website_event`) is append-only with no persisted states. I rendered the *request* lifecycle (received → validated → derived → stored / dropped) as pills, which is honest but a stretch.
*Fix:* allow "the spine" (a flow or derivation chain) as the alternative when the core entity has no lifecycle, and say pills are then optional.

**F3. The eyebrow format `Deep-dive · <Domain>` (§3.3) is specified for "a guide page", but foundation pages are not deep dives.**
I invented `Foundation · <Domain>`. Foundation pages also span several domains, so "the page's domain accent" is ill-defined for them.
*Fix:* give foundation pages an explicit eyebrow and say which accent they use (or brand).

**F4. Shiki's inline background defeats the "code blocks stay cream in dark mode" rule (§7.2, §6.3).**
`<Code>` emits `style="background-color:#fff"` on the `<pre>`. A stylesheet rule cannot override it without `!important`. The spec mentions the code-block reset for the inner `<code>` but not this.
*Fix:* add the `!important` override (or a transformer) to the dark-mode rules and the pitfalls list.

**F5. Rule §6.3 says to frame code blocks from a page `is:global` block. That contradicts §2.4 (one global stylesheet) and leads to copy-paste across pages.**
I put `pre.astro-code` framing in `public/styles.css`; it works because that file is not scoped.
*Fix:* say "in `public/styles.css`".

**F6. The favicon 404 fails the "no console errors" gate (§9.2) on every fresh browser.**
Chrome requests `/favicon.ico` at the origin root, so under a base path it 404s even if you ship one in `public/`.
*Fix:* require `<link rel="icon" href="data:,">` (or a base-path-aware icon link) in the Base layout spec (§4.1).

**F7. PR previews need a per-build base path, but the spec never says where it comes from (§4.1, §10.3, §2.3 "base path if needed").**
A static `base` in `astro.config.mjs` makes preview builds load production assets. I read `BASE_PATH` from the environment and set it per workflow.
*Fix:* state that the config must take the base from an env var. Give the exact preview base (`/<repo>/pr-preview/pr-<N>/`). Name the actions and options (e.g. `JamesIves/github-pages-deploy-action` `clean-exclude: pr-preview/`; `rossjrw/pr-preview-action` `umbrella-dir`) so "cleaning the branch except the PR-preview folder" is actionable.

**F8. "One inline script at the bottom of the page" (§8.3) conflicts with being able to verify the exact shipped logic outside the browser.**
To make the Node check execute the same bytes the page ships, I put the logic in `src/widgets/*.js`, imported with `?raw`, and emitted it via `<script is:inline set:html=…>`. The output is still one inline script.
*Fix:* explicitly bless a shared logic module per widget and describe the `vm`-loading pattern (the package is ESM, so `require` fails on a plain script).

**F9. The contrast audit (§9.3) misses text that matters.**
- It walks text nodes only, so form-control values (inputs, selects, placeholders) — the main text in a widget — are never audited.
- It ignores `opacity` (a disabled input at `opacity: .6` passes).
- Its "nearest opaque background" rule skips translucent backgrounds (the blurred top bar) and falls through to the page background, which may differ from what is visible.
- 3.0 is the WCAG threshold for large text; body text in AA needs 4.5.

*Fix:* include `input`, `select` and `textarea` values and placeholders, multiply by effective opacity, composite translucent backgrounds, and either justify 3.0 or use 4.5 for text under 18.66px bold / 24px.

**F10. Tree component edge cases (§4.5).**
- "Split at the first `#`" breaks any line containing `#` that is not a comment (URL fragments, `C#`, `#include`).
- "Wrap every path segment ending in `/`" is ambiguous for `src/app/(main)/`: one span or three?

*Fix:* split on the first whitespace-preceded `#`, and define a segment as a run without whitespace or tree glyphs.

**F11. "Every cited path exists" (§13.1) versus build outputs.**
Explaining a build means citing generated paths (`public/script.js`, `geo/`, `src/generated/prisma`) that are gitignored.
*Fix:* allow generated paths if the page labels them as build outputs, and suggest checking them against the target's `.gitignore`.

**F12. "One key callout per page" (§3.3.5) is not in the acceptance criteria (§13.1).**
I missed it on five pages until a manual pass.
*Fix:* add it to §13.1. Also add "headings make claims" and "a reciprocal link exists" — both are easy to forget and cheap to check.

**F13. Eight domain accents are mandatory (§5.1) regardless of how many domains the target has.**
Umami arguably has six. I padded with `events` and `links`, which no page uses.
*Fix:* "up to eight; at least one per page group".

**F14. The nav spec (§4.2) does not say where the Hub sits.**
Entries are links or group separators, and the hub is not in any listed group. I placed it first with no group. The brand link's target is also unspecified (I used `index.html`).

**F15. The backdrop-click test (§9.2) does not say where to click.**
The drawer covers the left 290px (up to 84% of a 390px phone), so a naive centre click hits the drawer on phones.
*Fix:* "click a point outside the drawer, e.g. `x = viewportWidth − 10`".

**F16. Quick-fact tiles must be "dated by being re-checkable" (§3.3.2).**
That phrase is unclear. I added the counting command under one tile.
*Fix:* require each tile to carry its source (command or file) in a tooltip or footnote.

**F17. `AGENTS.md / CLAUDE.md` (§2.3, §12): one, the other, or both?**
I wrote AGENTS.md and made CLAUDE.md a pointer. Say which is canonical.

**F18. There is no guidance on claims that only a port can check.**
The most valuable finding — six copies of the channel rule disagree — is not covered by any upstream test. The spec's research method (§11) assumes facts are confirmed by reading code or a DB.
*Fix:* add "when a behavioural claim rests on your port rather than an upstream assertion, say so on the page" (I did this in the widget's evidence note).

**F19. Minor gaps.**
- The live URL is required in README/AGENTS (§12.1) before anything is deployed; say "placeholder until first deploy".
- `npm ci` in CI requires a committed lockfile; §2.3's layout omits `package-lock.json`.
- Astro builds pages alphabetically, so the build log order is not the reading order. Harmless, but worth a line.
- §8.4 covers sliders but not free-text inputs, which a resolver needs to show "edited" states.

---

## 4. Deviations from the spec, and why

| Deviation | Why |
|---|---|
| Widget logic lives in `src/widgets/*.js` and is inlined via `?raw` + `set:html` instead of being written literally in the page | So the exact shipped code is what the Node check executes (F8). The page still emits one inline IIFE-wrapped script. |
| Code-block framing is in `public/styles.css`, not a per-page `is:global` block | One source of truth (F5). The dark cream override needed `!important` (F4). |
| Foundation pages use the eyebrow `Foundation · <Domain>` | The spec gives none (F3). |
| Added `<link rel="icon" href="data:,">` to Base | Otherwise the "no console errors" gate fails (F6). |
| Hub lifecycle pills show the request lifecycle | Umami's central row has no stored lifecycle (F2). |
| Public hosting chosen explicitly (in `astro.config.mjs`, README, AGENTS) | §10.1 allows it for an open-source target. Nothing was deployed. |
| Widget defaults come from tests and fixtures, not a dev DB | No DB exists (F1). Each widget states its evidence on the page. |
| `tracker-script` has no widget | Its mechanism is mostly browser event wiring. The candidates (e.g. a DNT/opt-out resolver) were too trivial to be worth it, and the spec says to skip interactivity where it isn't honest. |
| Two of the eight domain accents are unused by any page | §5.1 mandates eight (F13). |
| Deep-dive count is 3 | The spec's minimum is 3 and the brief allowed 2–3. |
| Workflows are written, never run; `BASE_PATH` comes from env | Brief forbids running them; F7. |
| Out-of-tree artefacts in the eval dir: `verify-scripts/` (Node checks, 3 screenshots) and a `.playwright-mcp/` console log written by the MCP tool | Needed for verification; nothing outside this directory was touched. |
