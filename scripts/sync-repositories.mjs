import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(await fs.readFile('content/projects/config.json', 'utf8'));
const snapshotPath = 'public/data/repositories.json';

export function normalizeRepository(repo, overrides = {}) {
  const override = overrides[repo.name] || {};
  return {
    id: String(repo.id), name: repo.name, fullName: repo.full_name,
    title: override.title || repo.name,
    description: override.description ?? repo.description ?? '',
    url: repo.html_url, homepage: repo.homepage || '',
    language: repo.language || '', topics: Array.isArray(repo.topics) ? repo.topics : [],
    stars: Number(repo.stargazers_count || 0), forks: Number(repo.forks_count || 0),
    createdAt: repo.created_at || null, updatedAt: repo.updated_at || null,
    pushedAt: repo.pushed_at || null, defaultBranch: repo.default_branch || 'main',
    archived: Boolean(repo.archived), fork: Boolean(repo.fork),
    featured: override.featured ?? config.featuredRepositories?.includes(repo.name) ?? false,
    category: override.category || 'github', image: override.image || '',
    imageAlt: override.imageAlt || '', technologies: override.technologies || (repo.language ? [repo.language] : []),
    links: { repository: repo.html_url, live: repo.homepage || '' }
  };
}

async function readExistingSnapshot() {
  try { return JSON.parse(await fs.readFile(snapshotPath, 'utf8')); }
  catch { return null; }
}

async function synchronize() {
  const existing = await readExistingSnapshot();
  try {
    const repositories = [];
    for (let page = 1; ; page++) {
      const url = `https://api.github.com/users/${encodeURIComponent(config.username)}/repos?per_page=100&page=${page}&sort=updated`;
      const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-static-build' } });
      if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
      const pageData = await response.json();
      if (!Array.isArray(pageData)) throw new Error('GitHub API returned invalid repository data');
      repositories.push(...pageData);
      if (pageData.length < 100) break;
      if (page > 20) throw new Error('GitHub pagination safety limit reached');
    }

    const eligible = repositories.filter(repo =>
      repo.owner?.login === config.username && !repo.private &&
      !(config.excludeForks && repo.fork) &&
      !(config.excludeArchived && repo.archived) &&
      !config.excludeNames?.includes(repo.name)
    );
    const normalized = eligible.map(repo => normalizeRepository(repo, config.repositoryOverrides));
    await fs.mkdir('public/data', { recursive: true });
    await fs.writeFile(snapshotPath, `${JSON.stringify({ syncedAt: new Date().toISOString(), repositories: normalized }, null, 2)}\n`);
    console.log(`Synchronized ${normalized.length} public repositories.`);
  } catch (error) {
    if (existing) {
      console.warn(`Repository synchronization failed: ${error.message}. Preserving the latest snapshot.`);
    } else {
      await fs.mkdir('public/data', { recursive: true });
      await fs.writeFile(snapshotPath, `${JSON.stringify({ syncedAt: null, repositories: [] }, null, 2)}\n`);
      console.warn(`Repository synchronization failed: ${error.message}. Wrote an empty fallback snapshot.`);
    }
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) await synchronize();
