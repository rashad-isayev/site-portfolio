# Rashad Isayev Personal Portfolio

A static, repository-managed portfolio for **SITE 1101: Principles of Information Systems**. It provides the Home, About, Projects, and Blog foundations and is ready for later visual and gamified development.

## Current functionality

- Responsive Home, About, Projects, and Blog pages
- Centralized profile data in `content/profile/profile.json`
- Manual academic project records in `content/projects/projects.json`
- Public GitHub repository synchronization and cached snapshots
- Search and filtering for projects and articles
- Markdown article validation and static article generation
- RSS, sitemap, robots configuration, and GitHub source/edit links
- GitHub Actions build and deployment workflow

## Technology

HTML5, CSS3, vanilla JavaScript ES modules, Node.js build scripts, Git, GitHub Actions, GitHub Pages, and minimal Markdown tooling.

## Structure

```text
content/       Editable profile, project, and blog content
public/data/   Static generated data snapshots
scripts/       Repository sync, validation, blog generation, and build
assets/        CSS, JavaScript, and images
blog/          Blog listing source
.dist          Generated static output (created by npm run build)
.github/       Deployment workflow
```

## Commands

```sh
npm ci
npm test
npm run sync:repos
npm run validate
npm run build
```

## Local preview

Run `npm run build`, then serve the repository or `dist/` directory with a static server. Because Pages uses `/site-portfolio/`, verify the production build under that base path.

## Content management

- Update profile information in `content/profile/profile.json`.
- Update manual academic projects in `content/projects/projects.json`.
- Manage repository rules in `content/projects/config.json`.
- Manage articles through GitHub using `BLOG_GUIDE.md`.
- Track missing authentic content using `CONTENT_TODO.md`.

## Deployment

The repository uses GitHub Actions in `.github/workflows/deploy.yml` and deploys `dist/` to GitHub Pages. Repository synchronization runs during push, scheduled, and manual workflow runs.

Repository: https://github.com/rashad-isayev/site-portfolio

Production: https://rashad-isayev.github.io/site-portfolio/
