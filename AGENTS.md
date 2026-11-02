# Authoring guide — Umami Engineering guides

Read this before adding or editing a page. It is the project's memory: when you hit a new trap, add it here in the same PR.

## 1. What this repo is

- A static site of long-form onboarding guides explaining the **Umami** analytics codebase (`umami-software/umami`, read at version `3.4.1`) to engineers in their first weeks.
- Stack: **Astro 5**, the only dependency (a dev dependency). No integrations, MDX, Tailwind, UI framework or client framework. One `.astro` file per page, one `.html` file per page in `dist/`.
- Live URL: `https://<owner>.github.io/umami-engineering-guides/` (set by `deploy.yml`; PR previews at `…/pr-preview/pr-<N>/`).
- Privacy: Umami is open source, so this site is **public by explicit decision**. If you fork this setup for a private codebase, make the repo private and restrict Pages visibility before pushing content. Never add anything that makes a request to another origin.
- **Source of truth: the Umami code wins** — over older docs, over the README, and over this guide. If a page and the code disagree, fix the page and add a correction callout.

## 2. Repo layout

| Path | What it is |
|---|---|
| `package.json` | one dev dependency (`astro`), scripts `dev` / `build` / `preview` |
| `astro.config.mjs` | `site`, `base` (from `BASE_PATH`, default `/umami-engineering-guides/`), `build.format: 'file'` |
| `public/styles.css` | the entire design system (tokens, components, dark overrides) |
| `public/nav.js` | drawer + theme toggle (event delegation) |
| `public/.nojekyll` | keeps GitHub Pages from running Jekyll |
| `src/layouts/Base.astro` | document shell: head, inline theme script, Nav, content wrapper |
| `src/components/Nav.astro` | top bar + drawer; **the only place pages are listed** |
| `src/components/Callout.astro` | `type` = note / warn / tip / key, optional `icon` |
| `src/components/Footer.astro` | `<footer class="docfoot">` with a slot |
| `src/components/Tree.astro` | renders an ASCII tree string inside a `<pre>` |
| `src/widgets/*.js` | widget logic shared between a page and its Node verification (see §7) |
| `src/pages/*.astro` | one file per page; the file list *is* the routing |
| `.github/workflows/` | `deploy.yml` (main → gh-pages), `pr-preview.yml` (PR → gh-pages/pr-preview/pr-N) |

## 3. Pages, nav groups and accents

Reading order (also the nav order in `Nav.astro`):

| Group | Page (file) | Accent |
|---|---|---|
| — | Hub (`index.astro`) | brand |
| Architecture & data | Data model (`data-model.astro`) | `storage` |
| | Architecture · components (`architecture-components.astro`) | `platform` |
| | Architecture · flows (`architecture-flows.astro`) | `collect` |
| | Codebase overview (`codebase.astro`) | `platform` |
| Deep dives | Session & visit identity (`session-identity.astro`) | `identity` |
| | Channel attribution (`channel-attribution.astro`) | `analytics` |
| | The tracker script (`tracker-script.astro`) | `collect` |

Domain accents (`--d-<name>` / `--d-<name>-tint`, helper class `.a-<name>`):

| Accent | Umami domain | Light | Dark |
|---|---|---|---|
| `collect` | tracker, `/api/send`, links/pixels ingest | coral `#c94a31` | `#f08a74` |
| `identity` | sessions, visits, distinct ids | blue `#2f6fd6` | `#7aa8f5` |
| `events` | `website_event`, event/session data | teal `#0f8a7e` | `#4cc2b3` |
| `analytics` | SQL queries, reports, channels | amber `#a8690f` | `#e0a948` |
| `tenancy` | users, teams, websites, auth | violet `#7c4dda` | `#b298f2` |
| `links` | links, pixels, shares | pink `#c2407e` | `#ec86b5` |
| `storage` | Postgres, ClickHouse, Kafka, Redis | cyan `#0e7f9e` | `#5cc6e0` |
| `platform` | Next.js app, tooling, packages | slate `#5b6577` | `#a3adbd` |

Every accent is ≥ 3:1 against `--surface` in both themes; keep it that way if you change one.

## 4. How to add a page

1. **Research** (see §10 and the method below): read the Umami files you will cite, collect `path:line` references, and get real numbers from tests, fixtures or seeds. Re-open every file you cite before publishing.
2. **Create** `src/pages/<slug>.astro` from this skeleton:
   ```astro
   ---
   import Base from '../layouts/Base.astro';
   import Callout from '../components/Callout.astro';
   import Footer from '../components/Footer.astro';
   ---
   <Base title="<Title> — Umami Engineering" description="<one line>" active="<slug>">
     <style>
       .hero .eyebrow { color: var(--d-<accent>); }
       h2 .num { color: var(--d-<accent>); }
     </style>
     <section class="hero">
       <div class="eyebrow">Deep-dive · <Domain></div>
       <h1><Title></h1>
       <p><The question this page answers.></p>
     </section>
     <nav class="anchorlist"><a href="#first">1 · First</a></nav>
     <h2 id="first"><span class="num">1</span>A heading that makes a claim</h2>
     <p class="lede">…</p>
     <Footer><span><Title> — deep-dive</span><span>Source: <span class="path">src/…</span></span></Footer>
   </Base>
   ```
3. **Add one nav entry** in `src/components/Nav.astro` under the right group. Nothing else lists pages.
4. Add a hub card in `index.astro` and **a reciprocal link** from at least one existing page.
5. `npm run build` — page count must equal the number of files in `src/pages/`.
6. Verify in both themes (§8, §9).

Foundation pages use the eyebrow `Foundation · <Domain>`; deep dives use `Deep-dive · <Domain>`.

## 5. Astro traps

1. A literal `{` or `}` in text or inline `<code>` is an expression. Write `&#123;` / `&#125;`.
2. `<` and `>` in text (`Partial<X>`, `<script>`) must be `&lt;` / `&gt;`.
3. Code samples: a frontmatter string constant rendered with `<Code code={x} lang="ts" theme="github-light" />`. Never hand-write `<pre>` code. Block framing lives in `public/styles.css` (`pre.astro-code`). Inside a template literal, escape `${` as `\${` when you are quoting code that contains it.
4. Inline SVG with its own `<style>` needs `<style is:inline>`. (The ERD in `data-model.astro` avoids the issue by using presentation attributes only.)
5. The theme script in `Base.astro` and every widget `<script>` must be `is:inline`. A widget whose logic lives in `src/widgets/*.js` is imported with `?raw` and emitted with `<script is:inline set:html={…}>`.
6. Scoped styles do not reach elements created with `createElement` — they lack Astro's scope attribute and render unstyled with no error. Style them in `<style is:global>`.
7. Global styles are emitted before scoped ones; give global overrides extra specificity with an `html` prefix (`html .widget`). Grep `dist/_astro/*.css` to confirm.
8. Never write `[data-theme="dark"] …` in a scoped `<style>` — the scope attribute is attached to the `<html>` compound and the rule silently never matches. Use `public/styles.css` or `<style is:global>` with `html[data-theme="dark"] …`.
9. Grid/flex children holding long unbreakable strings (UUIDs, query strings) need `min-width: 0` and `overflow-wrap: anywhere`.
10. *(found while building this site)* Astro sorts and builds pages alphabetically; the build log lists `data-model` before `index`. That is not an error.

## 6. Design system (`public/styles.css`)

Tokens on `:root`, redefined under `:root[data-theme="dark"]`: surfaces (`--bg`, `--bg-soft`, `--surface`, `--surface-2`), ink (`--ink`, `--ink-soft`, `--ink-faint`), lines, brand (`--brand`, `--brand-dark`, `--brand-tint`), the eight domain accents, shape (`--radius`, `--radius-sm`, `--shadow`, `--shadow-sm`), type (`--sans`, `--mono`).

| Need | Classes |
|---|---|
| Page intro | `.hero > .eyebrow + h1 + p`, `.lede` |
| Section heading | `h2 > span.num` |
| Jump links | `.anchorlist > a` |
| Grid | `.grid.cols-2/3/4` |
| Card / domain card | `.card`; `a.dcard.a-<accent> > .dhead (h3, .sub) + .dbody` |
| Table | `.tablewrap > table` |
| Code | `code`, `.path`, `.tag-code` |
| Chips / pills | `.chips > .chip(.solid,.k)`; `.pill.pill-happy/-mid/-stop/-neutral` |
| Callouts | `<Callout type="note|warn|tip|key">` |
| Diagram card | `.diagram` + `.cap` (stays light in dark mode) |
| Layered bands | `.bands > .band.a-<accent> > .label + .nodes > .node(.lg) (.sub)`; `.flowarrow` |
| Steps | `.steps.a-<accent> > .step > .marker + .body (.t .d .meta)` |
| Tree | `<Tree tree={CONST} />` |
| Key/value | `dl.kgrid` |
| Misc | `.small`, `.muted`, `.center`, `hr`, `footer.docfoot` |

**Page-local patterns** (copy from an existing page, do not globalise): stat tiles (`.stat-row` / `.stat-cell`, see `data-model.astro`), `.split` two-column layout (`session-identity.astro`), the widget kit (`.widget`, `.wtitle`, `.wbadge`, `.wsub`, `.wcontrols`, `.wctl`, `.wout`, `.wrow`, `.verdict.ok/.warn/.stop` — see `session-identity.astro` and `channel-attribution.astro`).

## 7. Interactivity

- Make a mechanism playable when it takes inputs and produces an output; skip it for narrative or taxonomy. No decorative motion.
- A widget must reproduce **real logic** and its **default state must reproduce a verified real value**: an integration-test assertion, a fixture, a seed, or a dev-DB row. Say on the page where the value comes from. Never invent a tidy number.
- Mechanics: one inline script at the bottom of the page, an IIFE; null-guard every DOM lookup; no libraries (Web Crypto for hashing, with a fallback message); hold exact values in a `state` object and read a control only in its own event handler; widgets live outside `.diagram` cards; styles for script-created nodes in `<style is:global>`.
- Prefer shared logic files in `src/widgets/` so the exact shipped code can be executed by a Node check (load it with `vm.runInNewContext`, since the package is ESM and the file is a plain script).
- Current widgets:
  | Page | Widget | Default reproduces | Evidence |
  |---|---|---|---|
  | `session-identity` | recompute session/visit id | `42656d85-a38f-5f46-b6ed-93af87a2c775` / `b0d0cc61-9131-5bcd-a4a6-5720d5c646c6` | fixture of `src/app/api/send/route.test.ts`, computed by a Node re-implementation checked against the RFC 4122 v5 vector |
  | `channel-attribution` | four-way channel resolver | alice → `paidAds` (all four) | `tests/api/revenue.spec.ts` asserts it on Postgres and ClickHouse |
- **Verify every widget programmatically** in a headless browser: default equals the known value; every resolver branch/preset; both ends of every slider; a script-created element has its computed style (e.g. `.wrow` is `display: grid`); and the contrast audit with each widget state visible.

## 8. Dark mode

1. Tokens flip automatically; don't add redundant dark overrides.
2. `.diagram` cards and Shiki code blocks stay light (`#ffffff` / `#f4f1ec` in dark). Text placed directly on them uses fixed dark colours (`#2a241e`, `#5a5148`), never tokens. SVG uses fixed hex fills only.
3. Hard-coded component colours (callouts, pills, verdicts, trace chips, top bar, backdrop) each have an explicit dark rule.
4. The code-block reset makes `pre.astro-code code` transparent, borderless and colour-inheriting.
5. Accent-filled badges (`.wbadge`, `.chip.solid`, step markers) use dark ink `#1d1b19` in dark mode.

**Contrast audit** (run in the browser console or via Playwright, dark then light): set `data-theme="dark"`; walk every element in `<body>` that has its own non-whitespace text node; skip anything inside `<svg>`; take its computed `color` and the background of the nearest ancestor-or-self with an opaque background (fallback: the page background); flag WCAG contrast < 3.0. Zero failures per page and per widget state.

## 9. Commands

```sh
npm install
npm run dev                          # live reload at http://localhost:4321/umami-engineering-guides/
npm run build                        # → dist/, one .html per page
npm run preview                      # serve dist/ exactly as deployed
BASE_PATH=/x/pr-preview/pr-1/ npm run build   # rehearse a PR-preview subpath
```

Verification checklist per changed page: no horizontal overflow at desktop and 390 px; drawer opens/highlights/closes on Escape and backdrop; theme toggle persists across navigation; every internal link and `#anchor` resolves; no console errors; no requests to other origins; contrast audit clean in both themes. Append `?v=<n>` between rebuilds — headless browsers cache.

## 10. Quick reference into Umami

| Topic | Where in the code | Page |
|---|---|---|
| Collection endpoint | `src/app/api/send/route.ts` | flows §1, session identity |
| Session / visit ids | `src/lib/crypto.ts` (`hash`, `uuid`, `getSalt`) | session identity |
| Bot / IP / geo detection | `src/lib/detect.ts`, `src/lib/ip.ts` | components §5, flows §1 |
| Backend switch | `src/lib/db.ts` (`runQuery`) | components §3 |
| Auth | `src/lib/auth.ts`, `src/lib/jwt.ts`, `src/app/api/auth/login/route.ts` | flows §3 |
| Permissions | `src/permissions/` | flows §4 |
| Schema | `prisma/schema.prisma`, `db/clickhouse/schema.sql` | data model |
| Channel attribution | `src/queries/sql/getChannelMetrics.ts`, `getChannelExpandedMetrics.ts`, `revenue/getRevenueMetrics.ts` | channel attribution |
| Domain lists | `src/lib/constants.ts` | channel attribution |
| Tracker | `src/tracker/index.ts`, `rollup.tracker.config.js` | tracker script |
| Short links / pixels | `src/app/(collect)/q/[slug]/route.ts`, `p/[slug]` | flows §2 |
| Integration personas | `tests/api/seed/dataset.ts` | codebase §5, channel attribution |
| Demo seed | `scripts/seed/` | codebase §4 |

## 11. Local tooling

- No Umami dev database was available when these pages were written; numbers come from the schema, constants, unit-test fixtures and the API suite's assertions. If you have a local Umami with `pnpm db:seed`, query it **read-only** and say on the page that it is seeded demo data, not production.
- Headless browser: Playwright (an isolated, ephemeral profile) driving `npm run preview`.
- Research agents are welcome for fan-out; demand `path:line` references and re-read every cited file yourself.
- Never read `.env` files in the target; take configuration facts from checked-in config.

## 12. House style

Concise, concrete, lightly opinionated. Second person sparingly. Real identifiers in inline code. No marketing language. Section headings make a claim ("Six copies of the rule exist…", not "Copies"). Prefer a table to a list of parallel facts and a diagram to a paragraph describing structure. One `key` callout per page; `warn` for traps; `note` for asides; `tip` for how-tos; a correction callout wherever the code contradicts a doc or a common belief.
