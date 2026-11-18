import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const base = '/site-portfolio';
const siteUrl = 'https://rashad-isayev.github.io/site-portfolio';
const blogDir = 'content/blog';
const articles = [];

marked.use({ gfm: true, breaks: false });

for (const name of await fs.readdir(blogDir)) {
  if (!name.endsWith('.md') || name.startsWith('_')) continue;
  const file = path.join(blogDir, name);
  const raw = await fs.readFile(file, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data;
  if (!data.title || !data.slug || !data.date) throw new Error(`${file}: title, slug, and date are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) throw new Error(`${file}: date must use YYYY-MM-DD`);
  if (data.draft) continue;
  const html = sanitizeHtml(await marked.parse(parsed.content), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class', 'id'], a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'title', 'loading'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src']
  });
  const words = parsed.content.replace(/[#*_`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
  articles.push({ ...data, sourceFile: name, excerpt: data.description || '', readingMinutes: Math.max(1, Math.ceil(words / 220)), body: html });
}

articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/articles.json', `${JSON.stringify(articles.map(({ body, ...article }) => article), null, 2)}\n`);

function shell(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${siteUrl}/"><link rel="stylesheet" href="${base}/assets/css/style.css"></head><body><header class="site-header"><a class="brand" href="${base}/index.html">RI<span>.</span></a><nav class="main-nav" aria-label="Main navigation"><a href="${base}/index.html">Home</a><a href="${base}/about.html">About</a><a href="${base}/projects.html">Projects</a><a class="active" href="${base}/blog/index.html">Blog</a></nav></header><main>${body}</main><footer class="site-footer"><p>© <span data-year></span> Rashad Isayev</p><div class="footer-links"><a href="https://github.com/rashad-isayev/site-portfolio">GitHub repository</a></div></footer><script src="${base}/assets/js/main.js" defer></script></body></html>`;
}

for (const article of articles) {
  const dir = `blog/${article.slug}`;
  await fs.mkdir(dir, { recursive: true });
  const sourceUrl = `https://github.com/rashad-isayev/site-portfolio/blob/main/content/blog/${encodeURIComponent(article.sourceFile)}`;
  const editUrl = `https://github.com/rashad-isayev/site-portfolio/edit/main/content/blog/${encodeURIComponent(article.sourceFile)}`;
  const body = `<article class="article-page"><a class="text-link" href="${base}/blog/index.html">← Back to Blog</a><p class="eyebrow">${article.category || 'Article'} · ${article.readingMinutes} min read</p><h1>${article.title}</h1><p class="lede">${article.description || ''}</p><div class="article-meta"><time datetime="${article.date}">${article.date}</time>${article.updated ? ` · Updated ${article.updated}` : ''}</div><div class="article-content">${article.body}</div><p><a href="${sourceUrl}">View source</a> · <a href="${editUrl}">Edit on GitHub</a></p></article>`;
  await fs.writeFile(path.join(dir, 'index.html'), shell(`${article.title} | Rashad Isayev`, article.description || '', body));
}

const rssItems = articles.map(article => `<item><title>${article.title}</title><link>${siteUrl}/blog/${article.slug}/</link><guid>${siteUrl}/blog/${article.slug}/</guid><pubDate>${new Date(article.date).toUTCString()}</pubDate><description>${article.description || ''}</description></item>`).join('');
await fs.writeFile('rss.xml', `<?xml version="1.0"?><rss version="2.0"><channel><title>Rashad Isayev Portfolio</title><link>${siteUrl}/</link><description>Portfolio and articles</description>${rssItems}</channel></rss>`);
const urls = ['', 'about.html', 'projects.html', 'blog/index.html', ...articles.map(a => `blog/${a.slug}/`)].map(route => `  <url><loc>${siteUrl}/${route}</loc></url>`).join('\n');
await fs.writeFile('sitemap.xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
console.log(`Generated ${articles.length} published article pages.`);
