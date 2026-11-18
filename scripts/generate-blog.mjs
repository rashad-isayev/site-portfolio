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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugifyHeading(value) {
  return value.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

function enhanceArticleHtml(html) {
  const headingIds = new Set();
  html = html.replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const plain = inner.replace(/<[^>]*>/g, '');
    let id = slugifyHeading(plain) || `section-${level}`;
    let unique = id;
    let suffix = 2;
    while (headingIds.has(unique)) unique = `${id}-${suffix++}`;
    headingIds.add(unique);
    return `<h${level} id="${escapeHtml(unique)}"><a class="heading-anchor" href="#${escapeHtml(unique)}" aria-label="Link to ${escapeHtml(plain)}">${inner}</a></h${level}>`;
  });
  html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_match, attrs) => {
    const language = attrs.match(/class="language-([^"]+)"/)?.[1];
    const label = language ? escapeHtml(language) : 'Code';
    return `<div class="code-block"><div class="code-block-header"><span>${label}</span><button class="copy-code" type="button" data-copy-code>Copy code</button></div><pre><code${attrs}></code></pre></div>`;
  });
  return html;
}

for (const name of await fs.readdir(blogDir)) {
  if (!name.endsWith('.md') || name.startsWith('_')) continue;
  const file = path.join(blogDir, name);
  const raw = await fs.readFile(file, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data;
  if (!data.title || !data.slug || !data.date) throw new Error(`${file}: title, slug, and date are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) throw new Error(`${file}: date must use YYYY-MM-DD`);
  if (data.draft) continue;

  const rendered = await marked.parse(parsed.content);
  let html = sanitizeHtml(rendered, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src']
  });
  html = enhanceArticleHtml(html);

  const words = parsed.content.replace(/[#*_`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
  articles.push({
    ...data,
    sourceFile: name,
    excerpt: data.description || '',
    readingMinutes: Math.max(1, Math.ceil(words / 220)),
    body: html
  });
}

articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/articles.json', `${JSON.stringify(articles.map(({ body, ...article }) => article), null, 2)}\n`);

function coverUrl(cover) {
  if (!cover) return '';
  if (/^https?:\/\//.test(cover)) return cover;
  return `${siteUrl}/${String(cover).replace(/^\/+/, '')}`;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function shell(article, body) {
  const title = `${article.title} | Rashad Isayev`;
  const description = article.description || article.excerpt || '';
  const canonical = `${siteUrl}/blog/${encodeURIComponent(article.slug)}/`;
  const cover = coverUrl(article.cover);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Rashad Isayev">
  ${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ''}
  <meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    description, datePublished: String(article.date), dateModified: String(article.updated || article.date),
    author: { '@type': 'Person', name: article.author || 'Rashad Isayev' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
  })}</script>
  <link rel="stylesheet" href="${base}/assets/css/style.css">
  <script src="${base}/assets/js/main.js" defer></script>
  <script src="${base}/assets/js/article.js" defer></script>
</head>
<body class="article-reader">
  <header class="site-header">
    <a class="brand" href="${base}/index.html" aria-label="Home">RI<span>.</span></a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu"><span></span><span></span></button>
    <nav id="main-nav" class="main-nav" aria-label="Main navigation">
      <a href="${base}/index.html">Home</a><a href="${base}/about.html">About</a><a href="${base}/projects.html">Projects</a><a class="active" href="${base}/blog/index.html" aria-current="page">Blog</a>
    </nav>
  </header>
  <main>${body}</main>
  <footer class="site-footer"><p>© <span data-year></span> Rashad Isayev</p><div class="footer-links"><a href="https://github.com/rashad-isayev/site-portfolio" target="_blank" rel="noreferrer">GitHub repository</a></div></footer>
  <div class="reading-progress" aria-hidden="true"><span id="reading-progress-bar"></span></div>
</body>
</html>`;
}

for (const article of articles) {
  const dir = `blog/${article.slug}`;
  await fs.mkdir(dir, { recursive: true });
  const canonical = `${siteUrl}/blog/${encodeURIComponent(article.slug)}/`;
  const body = `<article class="article-page" data-article-title="${escapeHtml(article.title)}" data-article-url="${canonical}">
    <nav class="article-back" aria-label="Article navigation"><a class="text-link" href="${base}/blog/index.html">← Back to Blog</a></nav>
    <header class="article-header">
      <p class="article-kicker">${escapeHtml(article.category || 'Article')}</p>
      <h1>${escapeHtml(article.title)}</h1>
      ${article.description ? `<p class="article-description">${escapeHtml(article.description)}</p>` : ''}
      <div class="article-byline">
        <span>By <strong>${escapeHtml(article.author || 'Rashad Isayev')}</strong></span>
        <span><time datetime="${escapeHtml(String(article.date))}">${formatDate(article.date)}</time>${article.updated ? ` · Updated <time datetime="${escapeHtml(String(article.updated))}">${formatDate(article.updated)}</time>` : ''}</span>
        <span>${article.readingMinutes} min read</span>
      </div>
      ${Array.isArray(article.tags) && article.tags.length ? `<ul class="article-tags" aria-label="Article tags">${article.tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>` : ''}
    </header>
    ${article.cover ? `<figure class="article-cover"><img src="${escapeHtml(coverUrl(article.cover).replace(siteUrl, base))}" alt="${escapeHtml(article.description || article.title)}"><figcaption>${escapeHtml(article.title)}</figcaption></figure>` : ''}
    <div class="article-content">${article.body}</div>
    <footer class="article-actions" aria-label="Article actions">
      <button id="article-share" type="button" class="reader-action">Share article</button>
      <button id="article-copy" type="button" class="reader-action" data-copy-url="${canonical}">Copy link</button>
      <span id="article-action-feedback" class="action-feedback" role="status" aria-live="polite"></span>
    </footer>
  </article>`;
  await fs.writeFile(path.join(dir, 'index.html'), shell(article, body));
}

const rssItems = articles.map(article => `<item><title>${escapeHtml(article.title)}</title><link>${siteUrl}/blog/${article.slug}/</link><guid>${siteUrl}/blog/${article.slug}/</guid><pubDate>${new Date(article.date).toUTCString()}</pubDate><description>${escapeHtml(article.description || '')}</description></item>`).join('');
await fs.writeFile('rss.xml', `<?xml version="1.0"?><rss version="2.0"><channel><title>Rashad Isayev Portfolio</title><link>${siteUrl}/</link><description>Portfolio and articles</description>${rssItems}</channel></rss>`);
const urls = ['', 'about.html', 'projects.html', 'blog/index.html', ...articles.map(a => `blog/${a.slug}/`)].map(route => `  <url><loc>${siteUrl}/${route}</loc></url>`).join('\n');
await fs.writeFile('sitemap.xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
console.log(`Generated ${articles.length} published article pages.`);
