// @ts-check
import { defineConfig } from 'astro/config';

// Umami is open source, so this site is published publicly on GitHub Pages — an explicit
// decision (spec §10.1), not a default. For a private target, make the repo private and
// restrict Pages visibility instead.
//
// BASE_PATH lets CI build the same source for production (/umami-engineering-guide/)
// and for PR previews (/umami-engineering-guide/pr-preview/pr-<N>/).
const base = process.env.BASE_PATH || '/umami-engineering-guide/';

export default defineConfig({
  site: process.env.SITE_URL || 'https://emmadusmani.github.io',
  base,
  build: { format: 'file' },
});
