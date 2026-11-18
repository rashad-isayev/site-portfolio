# Managing the Blog with GitHub

Create a new `.md` file in `content/blog/` through GitHub, copy `_template.md`, and commit it.

## Front Matter

Required fields are `title`, `slug`, `date`, and `description`. Use `draft: true` while preparing an article. Set `draft: false` or remove the field to publish.

## Images

Upload images to `assets/images/blog/` and reference them from Markdown using relative repository paths. Keep meaningful alt text.

## Publish, Update, and Delete

- Publishing: commit a valid article with `draft: false`.
- Updating: edit the Markdown file and commit.
- Unpublishing: set `draft: true` and commit.
- Deleting: delete the Markdown file and commit.

GitHub Pages deployment runs after successful pushes. Draft Markdown committed to a public repository remains readable on GitHub itself even though it is excluded from the website.

## Preview Locally

Run `npm ci`, `npm test`, and `npm run build`. Open `dist/index.html` through a local static server.
