# Home Page

A minimal site containing only its home page, built with [Astro](https://astro.build).

## Getting started

Requires [Node.js](https://nodejs.org) 18.20+ (20 or 22 LTS recommended).

```sh
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:4321
npm run build    # build the static site into ./dist
npm run preview  # preview the production build locally
npm run check    # type-check .astro and .ts files
```

## Project structure

```
public/                 Static files served as-is (favicon, robots.txt, images)
src/
├── consts.ts           Site title and description
├── layouts/            Page shell and metadata
├── pages/index.astro   The only page
└── styles/global.css   Global styles and light/dark color variables
```

## Customizing

1. Update the title and description in `src/consts.ts`.
2. Set your domain as `site` in `astro.config.mjs`.
3. Add home page content in `src/pages/index.astro` if needed.

## Deploying

The site deploys to GitHub Pages automatically on every push to `master`
via `.github/workflows/deploy.yml`. It is served at
<https://liad-1.github.io/>.

One-time setup: in the GitHub repo, go to **Settings → Pages** and set
**Source** to **GitHub Actions**.
