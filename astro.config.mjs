import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ukuleletuesday.github.io',
  base: '/songs',
  trailingSlash: 'always',
  build: {
    format: 'directory', // preserves /sheets/slug/ URL structure
  },
});
