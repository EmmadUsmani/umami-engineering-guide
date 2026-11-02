# Clean-room spec: a codebase onboarding-guide site

A specification for building a **small, private, static website of engineering-onboarding guides that explains one target codebase** — its data model, architecture, flows and tricky subsystems — to a new engineer. It describes the *product*, the *architecture*, the *authoring method* and the *quality gates*. It contains no source code and is independent of any particular company or codebase: apply it to any repository (a company monolith, an open-source library, a set of services) and you get the same kind of site.

Terms used throughout:

- **Target codebase** — the repository the site documents. The site never ships code from it; it explains it.
- **Docs repo** — the new repository that holds the site.
- **Page** — one guide, one URL, one source file.
- **Must / should / may** — hard requirement / strong default / optional.

---

## 1. What you are building

### 1.1 The product

A set of 6–25 long-form guide pages, each a single scrolling page, reachable from a hub page and a global navigation drawer. A reader is an engineer in their first weeks on the target codebase. Each page answers one question well ("what are the nouns and how do they relate?", "what happens end to end when a user does X?", "how does subsystem Y decide Z?").

The site's distinguishing qualities, in priority order:

1. **Correct.** Every specific claim (a file path, a field name, a count, an enum value, a branch condition) traces to something the author actually read in the target codebase or its development database. The code is the source of truth; where older docs disagree, the page says so.
2. **Mental model first.** Each page opens with the one distinction or spine that makes the rest click.
3. **Show, then explain.** Hand-built diagrams and short real code excerpts carry the explanation; prose connects them.
4. **Playable where honest.** When a page explains a mechanism with inputs and an output, it ships a small in-browser widget that runs the real logic over real data so the reader can check the claim (see §8).
5. **Self-contained and private.** No runtime requests to any third party; hosted where only authorised readers can see it.

### 1.2 Non-goals

- Not API reference documentation (no generated per-function docs).
- Not a wiki: no in-browser editing, no search backend, no comments, no analytics.
- Not a framework showcase: no client-side app framework, no CSS framework, no UI library.

---

## 2. Technical architecture

### 2.1 Stack

- **Static site generator: Astro (major version 5).** It is the *only* dependency in the manifest (a dev dependency). No integrations, no MDX, no Tailwind, no UI framework.
- **Node** current LTS for local work and CI.
- **Package scripts:** exactly three — `dev` (dev server with live reload), `build` (static output to `dist/`), `preview` (serve `dist/` locally).
- **Base path from the environment.** The config reads the site URL and the base path from environment variables with production defaults, so the same source builds for production and for each PR preview (`/<repo>/pr-preview/pr-<N>/` on a project-style Pages URL, `/pr-preview/pr-<N>/` on a root domain). A hard-coded base makes preview builds load production assets.
- **Output format: one `.html` file per page** (configure Astro's build format as "file", not directory-style). Consequence: cross-page links are plain relative filenames like `data-model.html` and `data-model.html#lifecycle`, and they work identically on the dev server, in the built output, and on the host.
- **Code highlighting:** Astro's built-in code component (Shiki), always with a *light* syntax theme. No other highlighter.
- **Client-side JavaScript:** only small, page-local, dependency-free scripts (the nav drawer, the theme toggle, and per-page widgets).

### 2.2 Self-containment (must)

- No CDNs, web fonts, remote images, embeds, analytics, or any request that leaves the site at runtime. Use the system font stacks (a sans stack and a mono stack).
- Diagrams are hand-built HTML/CSS or inline SVG authored in the page.
- Images, if any, live under `public/` and are committed.

### 2.3 Repository layout

```
docs-repo/
├── package.json             # one dev dependency (astro), three scripts
├── package-lock.json        # committed — CI installs with a clean, lockfile-exact install
├── astro.config.mjs         # site URL + file-style build output (+ base path if needed)
├── .gitignore               # node_modules/, dist/, .astro/
├── README.md                # what it is, live URL, local dev, how it's organised
├── AGENTS.md                # the canonical authoring guide for humans and coding agents (§12)
├── CLAUDE.md                # optional one-line pointer to AGENTS.md for tools that look for it
├── .github/workflows/
│   ├── deploy.yml           # push to main → build → publish
│   └── pr-preview.yml       # PR → build → publish under a preview subpath → comment link
├── public/
│   ├── .nojekyll            # stop the host's Jekyll pass from touching output
│   ├── styles.css           # the whole shared design system (§5)
│   └── nav.js               # drawer behaviour (§4.3)
└── src/
    ├── layouts/Base.astro   # the document shell (§4.1)
    ├── components/
    │   ├── Nav.astro        # top bar + drawer; the ONLY place nav links are listed
    │   ├── Callout.astro    # coloured aside
    │   ├── Footer.astro     # page footer (slot only)
    │   └── Tree.astro       # directory-tree renderer
    ├── widgets/             # optional: pure widget logic, one plain-JS file per widget (§8.3)
    └── pages/
        ├── index.astro      # the hub
        └── <one file per guide>.astro
```

The set of files in `src/pages/` *is* the routing. There is no content collection, no markdown pipeline, no frontmatter-driven page list.

### 2.4 Why these choices

- One page = one file keeps every guide independently editable and reviewable, and lets each page carry its own diagrams, scoped styles and widgets.
- A single global stylesheet in `public/` (not imported through the bundler) is loaded by every page, so the design system is one file anyone can read.
- File-style output plus relative links means no router, no trailing-slash ambiguity, and links that survive being served from a subpath.

---

## 3. Information architecture

### 3.1 Page set

Build the set in this order; it is also the reading order.

| Group | Page | Answers |
|---|---|---|
| — | **Hub** (`index`) | What is this codebase, what is the one mental model, where do I start? |
| Architecture & data | **Data model** | The core tables/entities grouped into domains, the central entity's lifecycle, an entity-relationship diagram of the spine. |
| | **Architecture · components** | What the system is made of: the deployable(s), API surfaces, background workers, data stores, external integrations — as a layered map. |
| | **Architecture · flows** | Step-by-step traces of the 4–7 core end-to-end flows. |
| | **Codebase overview** | Where code lives: packages/apps, their stacks, the dev CLI/tooling, a directory tree. |
| Deep dives | 3–10 pages | One subsystem or flow each, in depth (§3.3). |
| (optional groups) | e.g. "Frontends", "Integrations", "Ops" | Per-surface or per-vendor pages, with an overview page first in each group. |

Five foundation pages (hub + four) come first because every deep dive cross-links into them.

### 3.2 The hub page

- A hero: eyebrow ("New-engineer orientation"), a title naming the codebase, and a one-paragraph description of what the system does and that the live code is the source of truth.
- **A "key" callout stating the single mental model** — the central entity and its lifecycle, with lifecycle states rendered as status pills (§5.3), colour-coded by phase (neutral → in-progress → terminal-good / terminal-bad). If the core entity has no persisted lifecycle (append-only records, a library, a pure pipeline), state **the spine** instead: the request path or derivation chain everything hangs off. Pills are then optional and must not imply stored states that don't exist.
- "The guides": a lede telling a newcomer what to read first, then one section per nav group, each a two-column grid of **domain cards** (§5.3). Every card is a link: title, one-line subtitle, two-sentence description of what the page covers. Each card's accent colour matches that page's domain accent.

### 3.3 Anatomy of a guide page

Top to bottom:

1. **Hero** — eyebrow `Deep-dive · <Domain>` on deep dives, `Foundation · <Topic>` on the four foundation pages (coloured with the page's domain accent; foundation pages that span domains use the brand colour or the accent of their dominant domain), an `h1`, and a lede paragraph stating the question the page answers.
2. **Quick-fact tiles** (optional) — a row of small stat tiles with real counts from the target system (e.g. "312 tables · 48 background jobs · 7 states"). Every number must be real, and each tile carries its source — the command, query or file that produces it — in a `title` tooltip or a footnote beneath the row, so a reader can re-check it later.
3. **Anchor list** — pill links to each numbered section.
4. **Numbered sections** — `h2` with an accent-coloured number, each with an `id`. Section headings should carry a claim where possible ("Retries are safe because the job is idempotent", not "Retries").
5. Inside sections: a **lede** sentence, then diagrams / tables / code excerpts / widgets, connected by short prose. **One key callout per page** for the thing a reader must not miss; warn callouts for traps; note callouts for asides; tip callouts for how-tos.
6. **Corrections** — wherever current code contradicts an older doc, wiki, or a widely held belief, say so explicitly in a callout. When a behavioural claim rests on your own reading or re-implementation rather than an upstream test or real data, say so on the page.
7. **Cross-links** — generous links into the foundation pages and sibling deep dives (`other-page.html#anchor`). When adding a page, add a reciprocal link from at least one related existing page.
8. **Footer** — left: page name and kind ("— deep-dive"); right: "Source:" followed by the main source paths in the target codebase, in the mono path style.

### 3.4 Voice

Concise, concrete, lightly opinionated. Second person sparingly. Real identifiers in inline code. No marketing language. Prefer a table to a list of parallel facts, a diagram to a paragraph describing structure.

---

## 4. The shell: layout and shared components

### 4.1 Base layout

A single layout component that every page uses. Props: `title` (required), `description` (optional, becomes the meta description), `active` (optional, the nav key to highlight).

It renders, in order:

- Document head: charset, responsive viewport, the title, the optional description, an icon link (a base-path-aware icon file, or an empty data-URI icon — otherwise the browser's automatic root `/favicon.ico` request 404s and fails the console-error gate), a link to the shared stylesheet, the drawer script (deferred), **an inline synchronous theme script** (§4.4), and a named head slot for page extras.
- Body: the Nav component (receiving `active`), then a centred content wrapper (max width ≈1180px, horizontal padding 24px, 16px on phones, generous bottom padding) containing the default slot.

Asset references (stylesheet, script, images) must resolve correctly when the site is served from a subpath (PR previews, or a project-style Pages URL). Build them from the configured base path rather than hard-coding a leading slash.

### 4.2 Nav component

- **One array of entries is the single source of navigation.** Entries are either links (`key`, `href`, `label`) or group separators (`group` label). The hub ("Overview") is the first entry, before any group. Adding a page means adding one link entry under the right group; nothing else lists pages.
- Renders a **sticky top bar**: hamburger button (left; three bars; `aria-controls` the drawer; `aria-expanded` reflects state), the site brand (a coloured dot + the site name, e.g. "<Project> Engineering"; it links to the hub), and the theme-toggle button pushed to the far right.
- Renders a **backdrop** and a **slide-in drawer** (left side, ~290px, max 84% of viewport width): a sticky head with the brand and a close (×) button, then the nav — group labels as small uppercase dimmed headings, links as full-width rows. The link whose key equals `active` gets a tinted background, accent text and a left accent border.
- The top bar is translucent with a backdrop blur.

### 4.3 Drawer behaviour (`nav.js`)

- State lives as an attribute on the root `<html>` element (present = open). CSS keys every open-state style off that attribute: drawer translates in, backdrop fades in, hamburger bars morph into an ×.
- Wired by **event delegation on the document**, so it works regardless of markup position: click on the hamburger toggles; click on anything marked as a closer (backdrop, × button) closes; `Escape` closes when open.
- Opening moves focus to the first drawer link; closing returns focus to the hamburger and updates `aria-expanded`.
- Respect `prefers-reduced-motion` (no transitions).

### 4.4 Theme system

- Two themes, light and dark, selected by a `data-theme` attribute on `<html>`.
- **No flash of wrong theme:** an inline, synchronous script in the head reads a stored preference from `localStorage` (a site-specific key); if absent or invalid, falls back to the OS `prefers-color-scheme`; sets the attribute before first paint. Wrap storage access in try/catch.
- The toggle button flips the attribute and stores the choice. Its icon is CSS-generated (moon in light mode, sun in dark mode).

### 4.5 Small components

- **Callout** — props `type` (note | warn | tip | key; default note) and optional `icon` (an emoji). Renders a flex row: icon, then the slotted body.
- **Footer** — a `<footer>` with a class, content slotted; laid out as a space-between flex row, small dimmed text, top border.
- **Tree** — takes one string prop containing an ASCII directory tree (authored as a template-literal constant in the page's frontmatter, never as inline markup). Behaviour:
  - Trim leading/trailing blank lines; keep interior blank lines and all indentation.
  - HTML-escape each line.
  - Split each line at the first `#` that is preceded by whitespace (so `C#`, URL fragments and `#include` inside names survive): the remainder becomes a dimmed comment span.
  - In the part before the comment, wrap every path segment ending in `/` in a bold, accent-coloured directory span. A segment is a run of characters containing no whitespace and no tree glyphs, so `src/app/(main)/` is one span. Leave tree glyphs (`│ ├ └ ─`) and plain filenames alone.
  - Render inside a `<pre>` so whitespace is preserved. (A `<div>` collapses the tree into unreadable soup — this is the reason the component exists.)

---

## 5. Design system (`public/styles.css`)

One global stylesheet. Everything here is available to every page; pages compose these classes and add page-local CSS only for what the system doesn't cover.

### 5.1 Tokens

All colours, radii, shadows and fonts are CSS custom properties on `:root`, **redefined under `:root[data-theme="dark"]`** so tokens flip automatically.

| Role | Tokens | Light guidance | Dark guidance |
|---|---|---|---|
| Surfaces | `--bg`, `--bg-soft`, `--surface`, `--surface-2` | warm off-white page, slightly darker soft fill, white cards | soft warm dark (not black), cards one step lighter than the page |
| Ink | `--ink`, `--ink-soft`, `--ink-faint` | near-black, mid grey-brown, light grey-brown | warm off-white, then two dimmer steps |
| Lines | `--line`, `--line-strong` | subtle warm borders | low-contrast dark borders |
| Brand | `--brand`, `--brand-dark`, `--brand-tint` | the site's brand colour, a darker shade for links, a very pale tint | a lighter brand, a still-lighter link colour, a dark tint |
| Domain accents | 8 × (`--d-<domain>`, `--d-<domain>-tint`) | saturated mid tones + pale tints | lightened accents + dark tints |
| Shape | `--radius` (~12px), `--radius-sm` (~8px), `--shadow`, `--shadow-sm` | soft, low-opacity warm shadows | darker, higher-opacity shadows |
| Type | `--sans`, `--mono` | system stacks | same |

**Domain accents** are up to eight colour slots (as many as the target has real domains — don't pad), each named after a domain *of the target codebase* (e.g. for a project-management app: projects, identity, tasks, billing, notifications, search, integrations, infra). Choose a distinct hue per slot — e.g. coral, blue, teal, amber, violet, pink, cyan, slate. Every accent must stay ≥3:1 against `--surface` in both themes.

Base type: 16px, line-height 1.6, antialiased; `h1` ~40px/800 weight in the hero; `h2` ~26px with `scroll-margin-top` so anchors clear the sticky bar; `h3` ~18px.

### 5.2 Accent helpers

Utility classes `.a-<domain>` set two local properties, `--accent` and `--accent-tint`, from the matching domain tokens. Components that are accent-aware (domain card, band, step markers) read `--accent` with the brand as fallback. A page applies its accent by setting the hero eyebrow and section numbers to its domain colour in its scoped styles.

### 5.3 Component catalogue

| Need | Classes | Behaviour |
|---|---|---|
| Page intro | `.hero` > `.eyebrow` + `h1` + `p`; `.lede` | Hero has bottom border and spacing; eyebrow is small uppercase tracked brand text; lede is a larger soft-ink paragraph |
| Section heading | `h2 > span.num` | The number is tabular and brand/accent coloured |
| Jump links | `.anchorlist > a` | Wrapping row of pill links on `--surface`, border highlights on hover |
| Grid | `.grid.cols-2/3/4` | CSS grid; 4→2 and 3→2 columns under ~880px, all →1 under ~560px |
| Card | `.card` | Surface, border, radius, small shadow |
| Domain card | `.dcard` (+ `.a-*`) with `.dhead` (`h3`, `.sub`) and `.dbody` | Accent-coloured top border, tinted head; usable as an `<a>` |
| Table | `.tablewrap > table` | Wrapper scrolls horizontally, bordered, rounded; uppercase small sticky header on soft fill; row hover |
| Inline code | `code` | Mono chip: soft background, border, brand-dark text |
| Path | `.path` | Mono, soft ink, *no* chip |
| Small code chip | `.tag-code` | Smaller mono chip |
| Chips | `.chips > .chip` (`.solid`, `.k`) | Wrapping row of rounded labels |
| Status pills | `.pill` + `-happy` / `-mid` / `-stop` / `-neutral` | Mono pills: green / amber / red / neutral, each with explicit dark-mode colours |
| Callouts | `.callout.note/.warn/.tip/.key` + `.ico` | Blue / amber / green / brand-tinted boxes with explicit dark-mode colours |
| Diagram card | `.diagram` + `.cap` | A card that scrolls horizontally; centred small caption — **stays light in dark mode** (§7) |
| Layered bands | `.bands > .band (> .label) > .nodes > .node (.sub, .lg)`; `.flowarrow` | Vertical stack of accent-tinted horizontal bands holding wrapping node boxes; min-width so it scrolls rather than crushes |
| Numbered steps | `.steps > .step > .marker + .body (.t .d .meta)` | Vertical timeline: CSS-counter-numbered circular markers (accent-coloured), connecting line, boxed bodies |
| Tree | `.tree` (via the Tree component) | Mono `<pre>`, preserved whitespace, horizontally scrollable |
| Key/value list | `.kgrid` (`dl`) | Two-column definition grid |
| Misc | `.small`, `.muted`, `.center`, `hr` | — |
| Footer | `footer.docfoot` | See §4.5 |

Page-local patterns (copy between pages; not global): stat tiles (`.stat-row` / `.stat-cell` / value + label), two-column `.split` collapsing at ~800px, custom flow diagrams, the widget kit (§8.3).

---

## 6. Authoring rules (Astro-specific traps)

These are the failure modes that cost the most time. The build catches the first three loudly; the rest fail **silently**.

1. **Braces in template text are expressions.** A literal `{` or `}` in page text or inline `<code>` must be written as the HTML entities for left and right brace. Braces inside quoted attributes, `<style>`, `<script>`, and code-component strings are fine.
2. **Angle brackets in text** (`Partial<X>`, `<Routes>`) must be entities.
3. **Code samples:** put each sample in a frontmatter string constant and render it with the built-in code component and a light theme. Never hand-write `<pre>` code blocks. Give the generated code blocks their margins/border/padding/shadow once, in the global stylesheet (they are generated outside any page's scope, and one rule beats a copy per page).
4. **Inline SVG with its own `<style>`** must mark that style block inline (unprocessed) so the framework doesn't hoist and scope it away from the SVG.
5. **Head scripts that must run synchronously** (theme) and **page widget scripts** must be marked inline so they are emitted verbatim and run.
6. **Scoped styles cannot reach JavaScript-created elements.** The framework stamps a scope attribute onto elements *it renders* and rewrites selectors to require it; a node made with `createElement` lacks it, so it renders unstyled with no error. Styles for any element created by script go in a global style block. Toggling a class on a template-rendered element is fine scoped.
7. **Global styles are emitted before scoped ones**, so a global override with the same specificity as a scoped rule loses on source order. Add specificity (e.g. prefix the selector with the `html` type selector). Confirm by grepping the built CSS for the class.
8. **Never write theme-conditional selectors (`[data-theme="dark"] …`) in a page's scoped style.** The scoper may attach the scope attribute to the `[data-theme]` compound, which lives on `<html>` and never carries a scope attribute — the rule silently never matches. Put theme overrides in the global stylesheet or a page-level global block (with the extra specificity from rule 7).
9. **Grid/flex children with long unbreakable content** (a hash, a URL, a one-line JSON) need `min-width: 0` or they push the page into horizontal scroll.

---

## 7. Dark mode rules

1. Tokens flip automatically, so standard components and any boxed text "just work". Don't add redundant dark overrides that set a background to a token that already flips.
2. **Diagram cards and code blocks stay light in both themes** (diagram cards: white in light, a cream such as `#f4f1ec` in dark; code blocks keep the light syntax theme's white). Note the highlighter writes the code block's background as an *inline style*, so if you want code blocks to match the cream in dark mode you need an `!important` override; leaving them white is also fine — just never let them go dark. Reason: hand-built SVG diagrams and light syntax themes contain fixed light-world colours that only read correctly on a light ground.
3. Therefore **any text or chip placed directly on a diagram card uses a fixed dark colour**, never an ink or accent token (those turn light in dark mode and fall below 2:1 on cream). Text inside a *boxed* child that paints its own token background (a node, step body, card) may use tokens.
4. Hard-coded component colours (callouts, pills, layered bands with inline tints, the translucent top bar, the backdrop) each get an explicit dark-theme rule in the global stylesheet.
5. A code-block reset must stop the inner `<code>` of highlighted blocks from inheriting the inline-code chip background (which goes dark and buries light-theme syntax colours): transparent background, no border/padding/radius, inherited colour and size.
6. Accent-filled badges with text: use a fixed dark ink on the accent rather than white, if the accent lightens in dark mode.

---

## 8. Interactivity

### 8.1 Posture

If a page explains a mechanism that takes inputs and produces an output, the default is to make that mechanism playable. Prose plus a static diagram is the fallback. Skip interactivity for narrative, taxonomy, or anything where the honest version would be fake. Decorative motion never earns a place.

### 8.2 The bar a widget must clear

A widget must make a **specific claim checkable**. Four patterns; prefer them over inventing a fifth:

| Pattern | Use when | Shape |
|---|---|---|
| **Recompute the real thing** | The page asserts a value is derived a particular way (a hash, a key, a score, a price, a slug). | Port the real algorithm to browser JS; feed it a real input row; show that it reproduces the real stored output. Let the reader perturb inputs and watch the output change. |
| **Decision resolver** | Code branches on a few inputs and people get it wrong. | Selects for each input → the verdict the real code would reach, plus which branch fired. Mirror the real conditional exactly, including its odd cases. |
| **Parameter sweep / cardinality** | A count or fan-out is non-obvious. | Sliders for the factors → the resulting grid/count, including fallbacks (e.g. "at least one row even when the list is empty"). |
| **Live schematic** | The data is geometry. | Draw the thing at the real coordinate scale; controls move it. |

**Non-negotiables:**

- **Evidence ladder for the default value.** Use the highest rung available and **show the rung in the widget** (a one-line evidence note):
  1. a value asserted literally by an upstream unit/integration test;
  2. a real row in a development database, seed, or fixture with its stored output;
  3. fixture inputs fed through two independent implementations that agree (your browser port and a separate re-implementation), with any standard step checked against a published reference vector.
  Rung 3 is not allowed when the algorithm is ambiguous enough that both ports could share a misreading. Outputs for non-default inputs that no upstream test asserts must be labelled as coming from the port.

- The widget reproduces **real logic** from the target codebase, and its **default state reproduces a real, verified value** (taken from the dev database, fixtures, seeds, or tests). Never invent a number to make a demo tidy. A plausible-looking fake is worse than no widget.
- A schematic **labels itself as a schematic** ("drawn locally from the record's own numbers; not a real render") and derives its coordinate space from real data. Anything it cannot show is flagged in the widget rather than silently omitted.

### 8.3 Mechanics

- One inline script at the bottom of the page, wrapped in an IIFE. Avoid `${` in template literals unless you mean interpolation.
- **Optional, recommended for recompute/resolver widgets:** keep the widget's pure logic in its own plain-JS file under `src/widgets/`, import it as a raw string, and emit it inside the page's inline script. The page still ships one inline script, and a standalone Node check can load and execute *the exact bytes the page ships* (e.g. with the `vm` module, since an ESM package won't `require` a plain script) to confirm the default value.
- **Null-guard every DOM lookup** so one missing element can't take down the page's other widgets.
- No libraries. Use platform APIs (e.g. the Web Crypto digest API for hashing; degrade to a message where unavailable).
- **Hold exact values in a JS state object**; read a control only when the user moves it. (A range input snaps to its `step`, so reading state back off it destroys precision and can break a "reproduces the stored value" claim.)
- **Widgets live outside diagram cards** (which are pinned light) as token-driven boxes so they theme for free. House kit, page-local, copied between pages:
  - `.widget` — surface box, border, accent left border, padding, shadow
  - `.wtitle` with `.wbadge` ("Interactive", accent-filled pill) + a title that is a question
  - `.wsub` — one line telling the reader what to do and what it reproduces
  - `.wcontrols` / `.wctl` — wrapping row of labelled controls showing the current value in mono accent text
  - `.wout` — the output region, `aria-live="polite"`, with a live consequence line so the reader never has to guess what changed
  - optional: verdict boxes (ok/warn/stop with explicit dark colours), split panes, a fixed-light schematic panel whose SVG uses only fixed hex colours and an inline style block, geometry set through `transform` attributes from JS
- All styles for JS-created nodes in a global style block (rule 6).

### 8.4 Verifying a widget (required)

A screenshot is not verification. Drive every control programmatically in a headless browser and **assert computed values**:

- the default state equals the known-real value;
- every branch of a resolver;
- both boundary settings of every slider, and free-text inputs with an edited value (including empty/null where the real code distinguishes them);
- a JS-created element actually received its styling (check a computed style property, not presence);
- the dark-mode contrast audit (§9.3) **with each widget state visible**, because some outputs only exist in the DOM once their branch is chosen.

---

## 9. Build and verification

### 9.1 The gate

`build` is the correctness gate. A clean build reports N pages built, N = number of files in `src/pages/`. Any build error is must-fix. (The build log lists pages alphabetically, not in reading order; that's expected.) A fresh npm may warn that dependency install scripts weren't approved; the build is unaffected.

### 9.2 Visual verification, both themes

Serve the built output with `preview` and load each changed page in a headless browser (use an ephemeral profile). Check:

- no horizontal page overflow at desktop and ~390px phone width (`scrollWidth` ≤ `clientWidth`);
- custom diagrams render;
- the nav drawer opens, highlights the active page, closes on Escape and on a backdrop click (click a point outside the drawer, e.g. 10px from the right edge — on a phone the drawer covers most of the viewport);
- the theme toggle switches and persists across navigation;
- all internal links and anchors resolve (no 404s; every `#id` target exists), and the site works when built and served under a PR-preview base path;
- no console errors (including a favicon 404 — see §4.1);
- no network requests to other origins.

Append a cache-busting query string between rebuilds; headless browsers cache aggressively.

### 9.3 Dark-mode contrast audit (algorithm)

1. Set `data-theme="dark"` on the root element.
2. Walk every element in the body that has its own non-whitespace text node, **plus every `input`, `select` and `textarea`** (their value and placeholder are text the reader must read).
3. **Skip SVG elements** (they colour via `fill`; diagrams are intentionally light).
4. Compute its text colour and the background of the nearest ancestor (including itself) with an opaque background, compositing any translucent backgrounds passed on the way (e.g. a blurred top bar); fall back to the page background. Multiply the text's alpha by the element's effective opacity (a disabled control at 60% opacity is dimmer than its colour says).
5. Compute the WCAG contrast ratio; flag anything below **3.0**. (3.0 is a floor that catches the real failure mode — token text that flipped light on a light card, typically ~1.9. It is the WCAG threshold for large text; teams wanting strict AA for body text should use 4.5 for text under 24px, or 18.66px bold.)
6. A correct page reports zero failures. Repeat for each widget state.

Run the same audit in light mode as a sanity check.

---

## 10. Hosting and deployment

### 10.1 Privacy (must, when documenting a private codebase)

- Host on GitHub Pages **with access control**: the docs repo is private and Pages visibility is restricted to people with repo access. (This requires an organisation plan that supports private Pages; confirm before relying on it.) Never publish publicly, and never add anything that phones home.
- For an open-source target, public hosting is acceptable — make that an explicit decision, not a default.

### 10.2 Production deploy workflow

Trigger: push to `main`, plus manual dispatch. Permissions: write repository contents. Concurrency: a single deploy group, not cancelled in progress.

Steps: check out → set up Node (LTS) with npm caching → clean install from the lockfile → build → publish `dist/` to a dedicated `gh-pages` branch using a standard branch-publish action (e.g. `JamesIves/github-pages-deploy-action`, with clean enabled and `pr-preview` listed in its clean-exclude option) so open previews survive a production deploy.

Pages is configured to serve from the `gh-pages` branch root.

### 10.3 PR preview workflow

Trigger: pull request opened / reopened / synchronised / closed. Permissions: write contents and pull requests. Concurrency: one group per PR number, cancel in progress.

Steps: check out → (skip the next three on close) set up Node → clean install → build **with the base path set to the preview subpath for this PR number** (§2.1) → a standard PR-preview action (e.g. `rossjrw/pr-preview-action`, preview branch `gh-pages`, umbrella dir `pr-preview`) that copies `dist/` into `gh-pages` under `pr-preview/pr-<N>/`, posts a sticky comment with the preview URL, and removes the folder when the PR closes.

Because previews are served from a subpath, every asset and link must be base-path-safe (§4.1, §2.1).

### 10.4 Local

`npm install`, then `npm run dev` for live reload, or `npm run build && npm run preview` to see exactly what deploys.

---

## 11. The research method (where page quality comes from)

Never write a page from memory or from the target's own prose alone.

1. **Read the target's own orientation docs first**: README, contributor guide, any agent-instruction files, architecture docs, the schema file, route definitions.
2. **Fan out.** For a multi-part topic, split it into subsystems (e.g. UI flow, API layer, data model, background jobs, seeding/fixtures) and research each separately — with parallel research agents if you have them. Demand **`path:line` references and short quoted snippets**, organised by the specific questions the page must answer.
3. **Cross-validate** findings against each other and against the code. Re-read every file you will cite in prose and confirm the path still exists. When no development database is available (common for open-source targets), take real values from upstream tests, fixtures and seed scripts, and rank them with the evidence ladder in §8.2.
4. **Get real numbers** from a local development database (read-only), seeds, fixtures or tests: true table/column names, enum values, order-of-magnitude row counts, real example rows for widget defaults. Note where local data is empty and don't present local data as production data.
5. **Respect secrets.** Never read environment/secret files; take configuration facts from checked-in config.
6. **Record corrections** — every place the code contradicts existing docs becomes a callout.

---

## 12. The authoring guide inside the docs repo

The docs repo must contain an authoring guide (`AGENTS.md` and/or `CLAUDE.md`) so that a fresh contributor — human or coding agent — can add a correct page without back-and-forth. Its sections:

1. What the repo is, the stack, the live URL (a placeholder until the first deploy), the privacy constraint, the source-of-truth rule (code wins, including over this guide).
2. Repo layout table.
3. The page list in reading order, the nav groups, and the domain-accent table (which page uses which accent).
4. How to add a page: research → create from the skeleton → add one nav entry → build → verify in both themes.
5. Framework traps (§6).
6. The design system catalogue (§5) and which patterns are page-local.
7. Interactivity rules and widget verification (§8).
8. Dark-mode rules and the audit (§7, §9.3).
9. Build/dev/verify commands.
10. A quick reference into the target codebase: topic → where in the code → which page covers it.
11. Local tooling available (database access, headless browser, research agents).
12. House style (§3.4).

Keep it updated whenever a new trap is discovered; it is the project's memory.

---

## 13. Build plan from zero

1. **Scaffold** the docs repo: manifest with Astro as the single dev dependency and three scripts; config with the site URL, file-style output and base path; ignore file; `.nojekyll`.
2. **Shell:** Base layout, Nav (with the single links array), drawer script, theme script and toggle, Callout, Footer, Tree.
3. **Design system:** tokens for both themes, accent helpers, the full component catalogue, dark overrides, nav/drawer/toggle styles, responsive breakpoints.
4. **Research** the target codebase (§11) and choose: the central mental model, the 8 domains and their accents, the core flows, the deep-dive topics, the candidate widgets (§8.2).
5. **Hub page.**
6. **Foundation pages:** data model → components → flows → codebase.
7. **Deep dives**, at least one with a "recompute the real thing" or "decision resolver" widget seeded from real data.
8. **Authoring guide** and README.
9. **Verify** (§9) every page in both themes; fix to zero contrast failures and zero overflow.
10. **Deploy workflows**; set Pages source; confirm access control before pushing content.

### 13.1 Acceptance criteria

- [ ] `build` succeeds; page count equals source file count.
- [ ] Manifest has exactly one dependency.
- [ ] Built output makes no request to another origin.
- [ ] Every page uses the Base layout, highlights itself in the drawer, and appears exactly once in the nav array.
- [ ] Drawer: open/close/Escape/backdrop/focus behaviour as §4.3.
- [ ] Theme: no flash on load, toggle persists, OS preference respected when unset.
- [ ] Every page: hero, anchor list, numbered sections with ids, at least one diagram or table, exactly one key callout, claim-carrying headings where possible, footer with source paths.
- [ ] Every new page has at least one reciprocal link from an existing related page.
- [ ] Every cited path exists in the target codebase (generated/gitignored build outputs are allowed only when the page labels them as such — check them against the target's ignore file); every number is reproducible from its stated source.
- [ ] Each widget's default output matches a verified real value and displays its evidence rung (§8.2); all branches/boundaries asserted programmatically.
- [ ] Zero dark-mode contrast failures (< 3.0) per page and widget state; zero horizontal overflow at 390px.
- [ ] All internal links and anchors resolve, including when served from a subpath.
- [ ] Authoring guide present and accurate.

---

## 14. Pitfalls collected from building the original

- A directory tree in a `<div>` collapses whitespace → use the Tree component.
- A range input's `step` silently rounded an exact stored value and made a "reproduces the real hash" claim false → state lives in JS.
- JS-built grid cells rendered as unstyled inline text with no error → global styles for JS-created nodes.
- A dark-mode override in a scoped style matched nothing → global styles with extra specificity.
- Token-coloured text on a light diagram card was illegible in dark mode → fixed dark colours on diagram cards.
- Highlighted code blocks inherited the dark inline-code chip background → the code-block reset.
- A long single-line value in a grid column caused page-wide horizontal scroll → `min-width: 0`.
- Root-absolute asset paths break under a subpath preview → base-path-aware references.
- Legacy hand-built HTML pages can be ported faithfully by injecting their body as raw HTML inside the shared shell, with their own namespaced stylesheet so their palette doesn't collide with the theme tokens — use only when a rewrite isn't worth it.

---

## 15. Validation

This spec was applied once, without other context, to an open-source web-analytics application (no development database available). It produced an 8-page site with two widgets. The build passed, contrast and overflow checks found nothing, and all 56 widget assertions passed. The 19 gaps that run reported have been folded into the sections above: the evidence ladder, the spine alternative to a lifecycle, the environment-driven base path, the favicon, the code-block background, the extended contrast audit, the Tree edge cases and the extra acceptance items.
