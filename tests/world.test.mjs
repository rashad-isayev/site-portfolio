import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('About world has one player renderer and one animation loop', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  assert.equal((source.match(/function drawPlayer/g) || []).length, 1);
  assert.equal((source.match(/drawNPC/g) || []).length, 0);
  assert.equal((source.match(/function loop\(/g) || []).length, 1);
  assert.ok(source.includes('cancelAnimationFrame(state.raf)'));
});

test('world data defines bounded scenes and separate locations', async () => {
  const source = await fs.readFile('assets/js/world-data.js', 'utf8');
  for (const required of ["'outdoor'", "'study'", "'workshop'", "'projects'"]) {
    assert.ok(source.includes(required));
  }
  assert.ok(source.includes('collisions'));
});

test('player starts outside the Project Terrace collision area', async () => {
  const source = await fs.readFile('assets/js/world-data.js', 'utf8');
  assert.ok(source.includes('spawn: { x: 480, y: 480 }'));
  assert.ok(source.includes('[382,330,196,116]'));
});

test('custom spritesheets are integrated as source-frame animations', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  for (const required of ['player_walk.png', 'player_idle.png', 'sourceX', 'sourceY']) {
    assert.ok(source.includes(required));
  }
  assert.ok(source.includes("frameRate = nextAnimation === 'walk' ? 10 : 2"));
  assert.ok(source.includes("frameCount = nextAnimation === 'walk' ? 6 : 2"));
  const idle = await fs.stat('assets/game/character/player_idle.png');
  const walk = await fs.stat('assets/game/character/player_walk.png');
  assert.ok(idle.size > 0);
  assert.ok(walk.size > 0);
});
