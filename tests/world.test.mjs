import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('About world has one player renderer and one animation loop', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  assert.equal((source.match(/function drawPlayer/g) || []).length, 1);
  assert.equal((source.match(/drawNPC/g) || []).length, 0);
  assert.equal((source.match(/function loop\(/g) || []).length, 1);
  assert.ok(source.includes('cancelAnimationFrame(state.raf)'));
});

async function loadWorldData() {
  const source = await fs.readFile('assets/js/world-data.js', 'utf8');
  const manifest = JSON.parse(await fs.readFile('assets/game/mossbound/mossbound-frames.json', 'utf8'));
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return { data: context.window.PortfolioWorldData, manifest };
}

test('world data converts v2 walking routes and keeps the four original interiors', async () => {
  const { data, manifest } = await loadWorldData();
  const outdoor = data.createOutdoor(manifest);

  assert.equal(outdoor.bounds.w, 1920);
  assert.equal(outdoor.bounds.h, 2520);
  assert.deepEqual(Array.from(outdoor.locations, location => location.name), [
    'Mothlight Archive', 'Starfall Observatory', 'Glasscap Conservatory', 'Tidemaker’s Workshop'
  ]);
  assert.equal(outdoor.segments.length, manifest.walkable.routes.reduce((total, route) => total + route.points.length - 1, 0));
  assert.equal(outdoor.segments[0].ax, manifest.walkable.routes[0].points[0][0] * manifest.worldScale);
  assert.equal(outdoor.locations[0].y, manifest.landmarks[0].y * manifest.worldScale);
  for (const location of outdoor.locations) assert.ok(data[location.scene]);
});

test('a fresh Mossbound world starts on the central trail', async () => {
  const { data, manifest } = await loadWorldData();
  const { spawn } = data.createOutdoor(manifest);
  assert.equal(spawn.x, 933.75);
  assert.equal(spawn.y, 1258.75);
  const html = await fs.readFile('about.html', 'utf8');
  assert.match(html, /Go north to the village or south to Moonpool/);
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
  assert.equal(manifest.height, 2016);
  assert.equal(manifest.worldScale, 1.25);
  assert.equal(manifest.worldWidth, 1920);
  assert.equal(manifest.worldHeight, 2520);
  assert.equal(manifest.spawn.x, 747);
  assert.equal(manifest.spawn.y, 1007);
  assert.equal(manifest.frameMs, 160);
  assert.equal(manifest.frameCount, 24);
  assert.equal(manifest.loopMs, 3840);
  assert.equal(manifest.atlas.frameHeight, 272);
  assert.equal(manifest.atlas.tileSize, 16);
  assert.equal(manifest.walkable.routes.length, 10);
});

test('viewport renderer keeps shared art-pixel presentation', async () => {
  const source = await fs.readFile('assets/js/world.js', 'utf8');
  assert.ok(source.includes('renderWidth = 48'));
  assert.ok(source.includes('renderHeight = 72'));
  assert.ok(source.includes('logicalW = Math.round'));
  assert.ok(source.includes('ctx.clearRect(0, 0, logicalW, logicalH)'));
  assert.ok(source.includes('ctx.imageSmoothingEnabled = false'));
  assert.ok(source.includes('mossBase, cameraX, cameraY, viewW, viewH'));
  assert.ok(source.includes('x - cameraX, y - cameraY, width, tileSize'));
});

test('About page has no game header and no padded canvas presentation', async () => {
  const html = await fs.readFile('about.html', 'utf8');
  assert.ok(!html.includes('class="game-topbar"'));
  const css = await fs.readFile('assets/css/style.css', 'utf8');
  assert.ok(css.includes('.game-world canvas') && css.includes('width:100%'));
  assert.ok(css.includes('height:100dvh'));
});
