import fs from 'node:fs/promises';
import path from 'node:path';

const errors = [];
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

try {
  await readJson('content/profile/profile.json');
  const manual = await readJson('content/projects/projects.json');
  const ids = new Set();
  for (const project of manual) {
    if (!project.id || !project.title) errors.push('Manual project missing id or title');
    if (ids.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
    ids.add(project.id);
  }
  await readJson('public/data/repositories.json');
} catch (error) { errors.push(error.message); }

const blogDir = 'content/blog';
try {
  const entries = await fs.readdir(blogDir, { withFileTypes: true });
  const slugs = new Set();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.startsWith('_')) continue;
    const source = await fs.readFile(path.join(blogDir, entry.name), 'utf8');
    if (!source.startsWith('---')) { errors.push(`${entry.name}: missing YAML front matter`); continue; }
    const parts = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!parts) { errors.push(`${entry.name}: invalid front matter block`); continue; }
    const slugMatch = parts[1].match(/^slug:\s*["']?([^\n"']+)/m);
    const titleMatch = parts[1].match(/^title:\s*["']?([^\n"']+)/m);
    const dateMatch = parts[1].match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
    if (!slugMatch || !titleMatch || !dateMatch) errors.push(`${entry.name}: title, slug, and date are required`);
    if (slugMatch) {
      const slug = slugMatch[1].trim();
      if (!/^[-a-z0-9]+$/.test(slug)) errors.push(`${entry.name}: invalid slug '${slug}'`);
      if (slugs.has(slug)) errors.push(`Duplicate article slug: ${slug}`);
      slugs.add(slug);
    }
  }
} catch (error) { errors.push(error.message); }

if (errors.length) {
  console.error(`Content validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('Content validation passed.');
