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
  for (const required of ['outdoor:', 'study:', 'workshop:', 'projects:', 'Mothlight Archive', 'Starfall Observatory', 'Tidemaker’s Workshop', 'Glasscap Conservatory']) {
    assert.ok(source.includes(required));
  }
  assert.ok(source.includes('w: 1920'));
  assert.ok(source.includes('h: 1280'));
  assert.ok(source.includes('routes:'));
});

test('player starts at the Mossbound southern clearing', async () => {
  const source = await fs.readFile('assets/js/world-data.js', 'utf8');
  assert.ok(source.includes('spawn: { x: 755 * scale, y: 955 * scale }'));
  assert.ok(source.includes('Tidemaker’s Workshop'));
});

test('facing direction uses canonical sprite rows and preserves direction', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  assert.ok(source.includes("const directionRow = { down: 0, up: 1, left: 2, right: 3 }"));
  assert.ok(!source.includes("east:"));
  assert.ok(!source.includes("west:"));
  assert.ok(source.includes("dx !== 0 && dy !== 0"));
  assert.ok(source.includes("state.player.dir = dx > 0 ? 'right' : 'left'"));
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

test('Mossbound manifest supplies exact art scale, timing, and spawn', async () => {
  const manifest = JSON.parse(await fs.readFile('assets/game/mossbound/mossbound-frames.json', 'utf8'));
  assert.equal(manifest.width, 1536);
  assert.equal(manifest.height, 1024);
  assert.equal(manifest.worldScale, 1.25);
  assert.equal(manifest.worldWidth, 1920);
  assert.equal(manifest.worldHeight, 1280);
  assert.equal(manifest.spawn.x, 755);
  assert.equal(manifest.spawn.y, 955);
  assert.equal(manifest.frameMs, 160);
  assert.equal(manifest.frameCount, 12);
  assert.equal(manifest.loopMs, 1920);
  assert.equal(manifest.atlas.frameHeight, 256);
  assert.equal(manifest.atlas.tileSize, 32);
  assert.equal(manifest.walkable.routes.length, 4);
});

test('viewport renderer keeps shared art-pixel presentation', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  assert.ok(source.includes('renderWidth = 48'));
  assert.ok(source.includes('renderHeight = 72'));
  assert.ok(source.includes('logicalW = Math.round'));
  assert.ok(source.includes('ctx.clearRect(0, 0, logicalW, logicalH)'));
  assert.ok(source.includes('ctx.imageSmoothingEnabled = false'));
  assert.ok(source.includes('frameCount = Number(manifest.frameCount)'));
});

test('About page has no game header and no padded canvas presentation', async () => {
  const html = await fs.readFile('about.html', 'utf8');
  assert.ok(!html.includes('class="game-topbar"'));
  const css = await fs.readFile('assets/css/style.css', 'utf8');
  assert.ok(css.includes('.game-world canvas') && css.includes('width:100%'));
  assert.ok(css.includes('height:100dvh'));
});
