# Ukulele Tuesday – Song Sheets

A searchable, browsable catalogue of [Ukulele Tuesday](https://www.ukuleletuesday.ie/) song sheets, published as a GitHub Pages site.

## Features

- **Full-text search** powered by [lunr.js](https://lunrjs.com/)
- **Filter by songbook** to narrow results to a specific collection
- **Grid / List view** toggle for browsing comfort
- Links directly to **PDF song sheets**

## How it works

The site is a single static HTML file (`index.html`) that fetches a `data.jsonl` dataset at runtime. The dataset is sourced from the [UkuleleTuesday/datasets](https://github.com/UkuleleTuesday/datasets) repository and hosted on Google Cloud Storage.

### Deployment

The [Deploy GitHub Pages](.github/workflows/deploy-pages.yml) workflow:

1. Downloads the latest `data.jsonl` from GCS
2. Publishes `index.html` + `data.jsonl` to GitHub Pages

The workflow runs automatically whenever:
- `index.html` is updated on `main`, or
- The upstream *Synchronize Datasets* workflow completes on `main`
