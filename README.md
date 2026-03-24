# Ukulele Tuesday – Song Sheets

A searchable, browsable catalogue of [Ukulele Tuesday](https://www.ukuleletuesday.ie/) song sheets, published as a GitHub Pages site.

## Features

- **Full-text search** powered by [lunr.js](https://lunrjs.com/)
- **Filter by songbook** to narrow results to a specific collection
- **Grid / List view** toggle for browsing comfort
- Links directly to **PDF song sheets**

## How it works

The site is generated statically at build time. There is a main static HTML file (`index.html`), and the build generates a shareable page slug for each song at `songs/<title>-<artist>`. The dataset is sourced from the [UkuleleTuesday/datasets](https://github.com/UkuleleTuesday/datasets) repository and hosted on Google Cloud Storage.

### Local development 

Recommended setup: use pnpm.

Build the site:
```
pnpm build
```

This will download the song dataset (the latest `data.jsonl` from GCS) and generate all the static pages.

To build and spin up a local server for testing, use 

```
pnpm serve
```

### Deployment

The [Deploy GitHub Pages](.github/workflows/deploy-pages.yml) workflow builds the site using `pnpm build` and pushes it to GitHub pages.

The workflow runs automatically whenever:
- `index.html` is updated on `main`, or
- The upstream *Synchronize Datasets* workflow completes on `main`
