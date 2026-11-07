// EpicScan website: static output for Cloudflare Pages.
// Pages Functions live in ./functions and are deployed alongside ./dist.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://epicworks.cz',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    build: {
      // Emit every script as a file so the CSP can forbid inline scripts.
      assetsInlineLimit: 0,
    },
  },
});
