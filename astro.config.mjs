import { defineConfig } from 'astro/config';

// Static site, deployed to Cloudflare Pages.
// i18n routing for the 20 languages is added in Step 3.
export default defineConfig({
  site: 'https://freeresizeimageonline.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
