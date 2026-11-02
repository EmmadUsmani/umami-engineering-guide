# Umami Engineering Guide

> **Preface — what this is, and what it isn't.**
> This repo is a **test run**. I'm building a method for producing engineering-onboarding guides for codebases: a static site of long-form, diagram-heavy, partly interactive pages that orient a new engineer. To check that the method transfers to a codebase it was never designed around, I wrote it up as a portable [clean-room spec](meta/CLEANROOM_SPEC.md) and handed that spec, with no other context, to a fresh Claude Code session along with a clone of an open-source project. This guide is what that session produced.
>
> I chose **[Umami](https://github.com/umami-software/umami)** (open-source, privacy-focused web analytics) because it's a good test: a real application with a real data model, two storage backends, a public collection endpoint, an embeddable tracker and some non-obvious derivation logic, at a size that one guide can cover. **I'm not affiliated with or involved in the Umami project.** Nothing here is official Umami documentation, and it may be wrong or out of date. Umami's own code is the source of truth.

---

## What the guide covers

Eight pages, written against Umami **3.4.1** (upstream commit `559e3c6`), in reading order:

| Group | Page | What it answers |
|---|---|---|
| — | **Hub** (`index`) | The one mental model: *a visitor is a hash, not a record*. The request lifecycle a hit goes through, and where to start reading. |
| Architecture & data | **Data model** | The Prisma models grouped into domains, the `event_type` values, an entity-relationship diagram, Postgres vs ClickHouse, typed custom event data. |
| | **Architecture · components** | A layered map from clients through routes, libs and queries to the stores; the API surface; the `runQuery` backend switch; geo resolution. |
| | **Architecture · flows** | Step-by-step traces of a page view, a short-link click, login, a dashboard query and a share page. |
| | **Codebase overview** | The directory tree, the stack, the `pnpm build` pipeline, commands, tests and CI. |
| Deep dives | **Session & visit identity** | How session and visit ids are derived from a salted hash. Includes an **interactive widget** that recomputes them in the browser, plus the server-time-zone trap at month boundaries. |
| | **Channel attribution** | The channel `CASE` rule and the four copies of it that behave differently. Includes an **interactive resolver** that runs one visit through all four. |
| | **The tracker script** | `data-` attributes, opt-outs, SPA hooks, the cache-token round trip, click tracking and the JS API. |

### The two widgets

Both widgets run a browser port of Umami's real logic. Each default state reproduces a value with stated evidence:

- **Session identity** recomputes the session and visit UUIDs (UUID v5 over SHA-512, with a time-based salt) from the fixture inputs in Umami's own route test. Its default output was independently cross-checked by a separate Node implementation (in `meta/verify/`).
- **Channel attribution** defaults to the integration-test persona `alice`, which resolves to `paidAds` in all four copies of the rule. Umami's API tests assert that result against both Postgres and ClickHouse. Each widget states where its other presets come from.

### Things the guide surfaced along the way

- The same hit can get a different session id depending on the server's time zone, because the salt's month boundary is computed in local time.
- The channel rule exists in several copies that disagree. Umami's own seed row for a paid Google ad comes out as `organicSearch` in one report and `paidSearch` in the others.
- Referrer-domain matching uses substrings, so `t.co` classifies `producthunt.com` and `walmart.com` as social traffic.
- The README asks for Node 18.18+, while CI and Docker run Node 22.

---

## Architecture of this repo

A deliberately small static site:

- **Astro 5 is the only dependency.** There are no UI frameworks, no CSS framework and no markdown pipeline. Each page is one `.astro` file, and the file list in `src/pages/` is the routing.
- **One `.html` file per page.** The build uses file format, so cross-links are plain filenames such as `data-model.html#erd`.
- **Self-contained.** The built site makes no runtime requests to any other origin: system fonts, hand-built HTML/CSS and inline-SVG diagrams, and dependency-free page scripts.
- **One shell, one design system.** A single layout provides the head, the no-flash theme script, the nav and the content wrapper. One global stylesheet holds the design tokens (light and dark), the domain accent colours and the component classes.
- **Widgets you can test outside the browser.** Pure widget logic lives in `src/widgets/*.js`. Pages inline it into their script, and the Node checks in `meta/verify/` execute the same bytes.
- **The base path comes from the environment.** `BASE_PATH` lets the same source build for production and for per-PR previews.

```
├── src/
│   ├── pages/              # one file per guide (8)
│   ├── layouts/Base.astro  # document shell: head, theme script, nav, wrapper
│   ├── components/         # Nav (the single link list), Callout, Footer, Tree
│   └── widgets/            # pure logic for the interactive widgets
├── public/
│   ├── styles.css          # the whole design system, both themes
│   ├── nav.js              # drawer + theme toggle behaviour
│   └── .nojekyll
├── .github/workflows/      # deploy + PR-preview workflows (written, never run)
├── AGENTS.md               # authoring guide for this site (CLAUDE.md points here)
└── meta/                   # documentation ABOUT this repo, not part of the site
```

## Running it

```sh
npm install
npm run dev        # http://localhost:4321/umami-engineering-guides/
npm run build      # static output in dist/ (8 pages)
npm run preview    # serve dist/ exactly as it would deploy
```

The site is served under the `/umami-engineering-guides/` base path, so the bare `localhost:4321/` shows nothing. Set `BASE_PATH=/` to serve from the root instead.

**This repo isn't deployed anywhere and has no remote.** The GitHub Actions workflows (publish `main` to a `gh-pages` branch, plus per-PR previews under `pr-preview/pr-<N>/`) show the intended hosting set-up but have never run.

## Editing the guide

Read **[AGENTS.md](AGENTS.md)** first. It's the authoring guide: the research method, the Astro traps that fail silently, the design system, the rules for widgets and dark mode, and how to verify a page (`npm run build` is the gate, then a contrast and overflow check in both themes).

## Meta documentation

[`meta/`](meta/) documents the repo itself: how it was produced, the evidence behind it, and the reusable spec. Start with [`meta/README.md`](meta/README.md).
