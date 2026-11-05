# Personal Website

A small, fast personal website built with [Astro](https://astro.build) and TypeScript.
It builds to static HTML/CSS with no client-side JavaScript by default.

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
├── consts.ts           Site title, description, nav and social links: edit first
├── content.config.ts   Schema for the blog collection
├── content/blog/       Blog posts as Markdown files
├── data/projects.ts    List of projects shown on /projects
├── layouts/            Page shell (<head>, header, footer)
├── components/         Reusable UI pieces
├── pages/              One file = one route (blog/[slug].astro renders each post)
└── styles/global.css   Global styles and light/dark color variables
```

## Customizing

1. Update your name and links in `src/consts.ts`.
2. Set your domain as `site` in `astro.config.mjs`.
3. Edit `src/pages/about.astro` and `src/data/projects.ts`.
4. Add posts to `src/content/blog/` (see `hello-world.md` for the frontmatter format).
   Set `draft: true` to hide a post.

## Deploying

The site deploys to GitHub Pages automatically on every push to `master`
via `.github/workflows/deploy.yml`. It is served at
<https://riadonaru.github.io/PersonalWebsite/>.

One-time setup: in the GitHub repo, go to **Settings → Pages** and set
**Source** to **GitHub Actions**.

Because the site lives under `/PersonalWebsite/`, write internal links with the
`withBase()` helper from `src/utils/url.ts`, e.g. `href={withBase('/about')}`.
