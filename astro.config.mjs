// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // GitHub Pages user site, served from the domain root: https://liad-1.github.io/
  // (If this ever moves to a project repo like github.com/Liad-1/<repo>,
  //  add `base: '/<repo>'` here. Links built with withBase() will follow.)
  site: 'https://liad-1.github.io',
});
