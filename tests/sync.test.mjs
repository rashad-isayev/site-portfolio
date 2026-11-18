import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRepository } from '../scripts/sync-repositories.mjs';

test('normalizes repository metadata without inventing values', () => {
  const repo = { id: 42, name: 'example', full_name: 'rashad-isayev/example', html_url: 'https://github.com/rashad-isayev/example', homepage: null, language: null, topics: null, stargazers_count: 0, forks_count: 0, created_at: null, updated_at: null, pushed_at: null, default_branch: 'main', archived: false, fork: false };
  const normalized = normalizeRepository(repo, {});
  assert.equal(normalized.id, '42');
  assert.equal(normalized.description, '');
  assert.equal(normalized.language, '');
  assert.deepEqual(normalized.technologies, []);
});
