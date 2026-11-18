import fs from 'node:fs/promises';

await fs.rm('dist', { recursive: true, force: true });
await fs.mkdir('dist', { recursive: true });

async function copy(source, destination) {
  await fs.cp(source, destination, { recursive: true, force: true });
}

await copy('assets', 'dist/assets');
await copy('public', 'dist/public');
await copy('blog', 'dist/blog');
for (const file of ['index.html', 'about.html', 'projects.html', 'README.md', 'rss.xml', 'sitemap.xml', 'robots.txt']) {
  await fs.copyFile(file, `dist/${file}`).catch(() => {});
}

const manual = JSON.parse(await fs.readFile('content/projects/projects.json', 'utf8'));
const repositories = JSON.parse(await fs.readFile('public/data/repositories.json', 'utf8')).repositories;
const projectsById = new Map(manual.map(project => [project.repositoryAssociation, project]));
const repoProjects = repositories.map(repo => ({
  id: `github-${repo.id}`, title: repo.title, shortDescription: repo.description,
  description: repo.description, category: 'github', featured: repo.featured,
  image: repo.image, imageAlt: repo.imageAlt, date: repo.createdAt,
  technologies: repo.technologies, contribution: '', repositoryAssociation: repo.fullName,
  links: repo.links
}));
const combined = [...manual, ...repoProjects.filter(repo => !projectsById.has(repo.repositoryAssociation))];
await fs.mkdir('dist/public/data', { recursive: true });
await fs.writeFile('dist/public/data/projects.json', `${JSON.stringify(combined, null, 2)}\n`);
await fs.writeFile('public/data/projects.json', `${JSON.stringify(combined, null, 2)}\n`);
const profile = await fs.readFile('content/profile/profile.json', 'utf8');
await fs.writeFile('public/data/profile.json', profile);
await fs.writeFile('dist/public/data/profile.json', profile);
console.log(`Built static output with ${combined.length} projects.`);
