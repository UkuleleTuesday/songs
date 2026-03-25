# Ukulele Tuesday – Song Explorer

A searchable, browsable catalogue of [Ukulele Tuesday](https://www.ukuleletuesday.ie/) song sheets, published as a GitHub Pages site.

Try it at: https://ukuleletuesday.github.io/songs/

## Features

- **Full-text search** powered by [lunr.js](https://lunrjs.com/)
- **Filter by difficulty and songbook** to narrow results
- Direct downloads to individual **PDF song sheets** and shareable URLs per song

## How it works

The site is built with [Astro](https://astro.build/) as a fully static site. The index page loads songs at runtime (client-side) for search and filtering. Individual song pages (`/sheets/<title>-<artist>/`) are generated statically at build time from the JSONL dataset. CSS and JS assets are fingerprinted for cache busting.

The dataset is sourced from the [UkuleleTuesday/datasets](https://github.com/UkuleleTuesday/datasets) repository (hosted on Google Cloud Storage) and downloaded as part of the build.

## Local development

Recommended setup: use pnpm.

Download the dataset and start the dev server:
```
pnpm download-data
pnpm dev
```

Or build the full static site:
```
pnpm build
```

Preview the production build locally:
```
pnpm preview
```

## Deployment

The [Deploy GitHub Pages](.github/workflows/deploy-pages.yml) workflow installs dependencies, runs `pnpm build`, and deploys the `dist/` output to GitHub Pages.

The workflow runs automatically when any file under `src/` is updated on `main`.
