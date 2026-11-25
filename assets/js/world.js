(() => {
  const canvas = document.querySelector('#portfolio-world');
  if (!canvas || canvas.dataset.initialized === 'true') return;
  canvas.dataset.initialized = 'true';

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const data = window.PortfolioWorldData;
  if (!data) return;

  let outdoor;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    scene: 'outdoor', player: {
      x: 0, y: 0, dir: 'up', moving: false,
      animation: 'idle', frame: 0, animationElapsed: 0
    },
    keys: new Set(), pad: new Set(), near: null, paused: false, textOpen: false,
    last: performance.now(), raf: 0, resizeObserver: null, cleanup: false,
    moss: {
      manifest: null,
      baseLoaded: false,
      atlasLoaded: false,
      ambientElapsed: 0,
      tiles: null
    }
  };

  const story = document.querySelector('#story-panel');
  const storyTitle = document.querySelector('#story-title');
  const storyText = document.querySelector('#story-text');
  const arrivalStory = { title: storyTitle.textContent, text: storyText.textContent };
  const prompt = document.querySelector('#interaction-prompt');
  const spriteAssetBase = new URL('assets/game/character/', document.baseURI).href;
  const sprites = {
    idle: new Image(),
    walk: new Image(),
    idleLoaded: false,
    walkLoaded: false
  };

  sprites.idle.onload = () => {
    sprites.idleLoaded = true;
    canvas.dataset.idleSprite = 'loaded';
  };
  sprites.walk.onload = () => {
    sprites.walkLoaded = true;
    canvas.dataset.walkSprite = 'loaded';
  };
  sprites.idle.onerror = () => {
    sprites.idleLoaded = false;
    canvas.dataset.idleSprite = 'error';
  };
  sprites.walk.onerror = () => {
    sprites.walkLoaded = false;
    canvas.dataset.walkSprite = 'error';
  };
  sprites.idle.src = `${spriteAssetBase}player_idle.png?v=2`;
  sprites.walk.src = `${spriteAssetBase}player_walk.png?v=2`;

  const mossAssetBase = new URL('assets/game/mossbound/', document.baseURI);
  const mossAssetUrl = file => new URL(`${file}?v=moonpool-v2`, mossAssetBase);
  const mossBase = new Image();
  const mossAtlas = new Image();

  mossBase.onload = () => { state.moss.baseLoaded = true; canvas.dataset.mossBase = 'loaded'; };
  mossBase.onerror = () => { state.moss.baseLoaded = false; canvas.dataset.mossBase = 'error'; };
  mossBase.src = mossAssetUrl('mossbound-base.png').href;

  function loadMotionAtlas() {
    const manifest = state.moss.manifest;
    if (!manifest || motionPreference.matches || mossAtlas.src) return;
    const { atlas, frameCount, width, height } = manifest;
    const { tileSize, columns, frameHeight } = atlas;
    const gridColumns = Math.ceil(width / tileSize);
    const gridRows = Math.ceil(height / tileSize);
    const grid = new Uint16Array(gridColumns * gridRows);
    const sources = atlas.tiles.map(({ x, y }, index) => {
      grid[y / tileSize * gridColumns + x / tileSize] = index + 1;
      return { x, y, sx: index % columns * tileSize, sy: Math.floor(index / columns) * tileSize, runLength: 1 };
    });
    // A horizontal run can share one draw when the same tiles are neighbors in the atlas.
    for (let index = sources.length - 2; index >= 0; index--) {
      const tile = sources[index];
      const next = sources[index + 1];
      if (next.y === tile.y && next.x === tile.x + tileSize && next.sy === tile.sy) {
        tile.runLength += next.runLength;
      }
    }

    mossAtlas.src = mossAssetUrl(atlas.file).href;
    mossAtlas.decode().then(() => {
      if (mossAtlas.naturalWidth !== columns * tileSize || mossAtlas.naturalHeight !== frameHeight * frameCount) {
        throw new Error('Mossbound atlas dimensions do not match the manifest');
      }
      state.moss.tiles = { grid, gridColumns, sources };
      state.moss.atlasLoaded = true;
      canvas.dataset.mossAtlas = 'loaded';
    }).catch(() => {
      canvas.dataset.mossAtlas = 'error';
    });
  }

  motionPreference.addEventListener('change', () => {
    state.moss.ambientElapsed = 0;
    loadMotionAtlas();
  });

  fetch(mossAssetUrl('mossbound-frames.json'))
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`Manifest ${response.status}`)))
    .then(manifest => {
      outdoor = data.createOutdoor(manifest);
      Object.assign(state.player, outdoor.spawn);
      state.moss.manifest = manifest;
      canvas.dataset.mossManifest = 'loaded';
      loadMotionAtlas();
    })
    .catch(() => {
      canvas.dataset.mossManifest = 'error';
      setStory(arrivalStory.title, 'The trail data could not load. Reload to try again, or use Read About.');
    });

  function clearInput() {
    state.keys.clear(); state.pad.clear(); state.player.moving = false;
    canvas.dataset.keys = '';
  }

  function inRect(x, y, [left, top, width, height]) {
    return x >= left && x < left + width && y >= top && y < top + height;
  }

  function inPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, previous = points.length - 1; i < points.length; previous = i++) {
      const [ax, ay] = points[previous];
      const [bx, by] = points[i];
      if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
    }
    return inside;
  }

  function isBlocked(x, y) {
    const map = state.scene === 'outdoor' ? outdoor : data[state.scene];
    if (!map || x < 24 || y < 24 || x > map.bounds.w - 24 || y > map.bounds.h - 24) return true;
    if (state.scene === 'outdoor') {
      const surface = outdoor.surfaces.find(({ area }) => inRect(x, y, area));
      if (surface) return !inPolygon(x, y, surface.outline);
      return !outdoor.segments.some(segment => {
        const { ax, ay, dx, dy, lengthSquared, radiusSquared, left, right, top, bottom } = segment;
        if (x < left || x > right || y < top || y > bottom) return false;
        const projection = ((x - ax) * dx + (y - ay) * dy) / lengthSquared;
        const t = Math.max(0, Math.min(1, projection));
        const offsetX = x - ax - t * dx;
        const offsetY = y - ay - t * dy;
        return offsetX * offsetX + offsetY * offsetY <= radiusSquared;
      });
    }
    return map.collisions.some(([rx, ry, rw, rh]) => x + 10 > rx && x - 10 < rx + rw && y + 12 > ry && y - 12 < ry + rh);
  }

  const slideAngles = [Math.PI / 8, Math.PI / 4, 3 * Math.PI / 8].map(angle => ({
    forward: Math.cos(angle), sideways: Math.sin(angle)
  }));

  function stepOutdoors(player, dx, dy, distance) {
    const steps = Math.ceil(distance / 2);
    const stride = distance / steps;
    for (let step = 0; step < steps; step++) {
      const x = player.x + dx * stride;
      const y = player.y + dy * stride;
      if (!isBlocked(x, y)) {
        player.x = x;
        player.y = y;
        continue;
      }

      // Try the closest legal direction first, moving only along the input's
      // projection onto that direction so sliding slows near a head-on edge.
      let slid = false;
      for (const { forward, sideways } of slideAngles) {
        for (const side of [-sideways, sideways]) {
          const slideX = player.x + (dx * forward - dy * side) * stride * forward;
          const slideY = player.y + (dy * forward + dx * side) * stride * forward;
          if (isBlocked(slideX, slideY)) continue;
          player.x = slideX;
          player.y = slideY;
          slid = true;
          break;
        }
        if (slid) break;
      }
      if (!slid) break;
    }
  }

  function movePlayer(dx, dy, dt) {
    if (dx === 0 && dy === 0) { state.player.moving = false; return; }
    const length = Math.hypot(dx, dy);
    dx /= length; dy /= length;
    if (dx !== 0 && dy !== 0) {
      // Diagonal movement has no diagonal sprite rows. Keep the chosen
      // horizontal direction stable for both diagonal combinations.
      state.player.dir = dx > 0 ? 'right' : 'left';
    } else if (dx !== 0) {
      state.player.dir = dx > 0 ? 'right' : 'left';
    } else {
      state.player.dir = dy > 0 ? 'down' : 'up';
    }

    const running = state.keys.has('ShiftLeft') || state.keys.has('ShiftRight');
    const speed = running ? 150 : 105;
    const beforeX = state.player.x;
    const beforeY = state.player.y;
    if (state.scene === 'outdoor') {
      stepOutdoors(state.player, dx, dy, speed * dt);
    } else {
      const nextX = state.player.x + dx * speed * dt;
      if (!isBlocked(nextX, state.player.y)) state.player.x = nextX;
      const nextY = state.player.y + dy * speed * dt;
      if (!isBlocked(state.player.x, nextY)) state.player.y = nextY;
    }
    state.player.moving =
      Math.abs(state.player.x - beforeX) > 0.001 ||
      Math.abs(state.player.y - beforeY) > 0.001;
  }

  function updatePlayerAnimation(dt) {
    const nextAnimation = state.player.moving ? 'walk' : 'idle';
    if (state.player.animation !== nextAnimation) {
      state.player.animation = nextAnimation;
      state.player.frame = 0;
      state.player.animationElapsed = 0;
    }

    state.player.animationElapsed += dt;
    const frameRate = nextAnimation === 'walk' ? 10 : 2;
    const frameCount = nextAnimation === 'walk' ? 6 : 2;
    if (state.player.animationElapsed >= 1 / frameRate) {
      const advanced = Math.floor(state.player.animationElapsed * frameRate);
      state.player.frame = (state.player.frame + advanced) % frameCount;
      state.player.animationElapsed %= 1 / frameRate;
    }
  }

  function syncDebugState() {
    canvas.dataset.scene = state.scene;
    canvas.dataset.playerX = state.player.x.toFixed(2);
    canvas.dataset.playerY = state.player.y.toFixed(2);
    canvas.dataset.moving = String(state.player.moving);
    canvas.dataset.keys = [...state.keys].concat([...state.pad]).join(',');
    canvas.dataset.direction = state.player.dir;
    canvas.dataset.animation = state.player.animation;
    canvas.dataset.animationFrame = String(state.player.frame);
  }

  function ambientFrame() {
    const { frameMs, frameCount } = state.moss.manifest;
    return Math.floor(state.moss.ambientElapsed / frameMs) % frameCount;
  }

  function update(dt) {
    if (!outdoor || state.paused || state.textOpen) { state.player.moving = false; return; }
    let dx = 0, dy = 0;
    if (state.keys.has('ArrowLeft') || state.keys.has('KeyA') || state.pad.has('left')) dx--;
    if (state.keys.has('ArrowRight') || state.keys.has('KeyD') || state.pad.has('right')) dx++;
    if (state.keys.has('ArrowUp') || state.keys.has('KeyW') || state.pad.has('up')) dy--;
    if (state.keys.has('ArrowDown') || state.keys.has('KeyS') || state.pad.has('down')) dy++;
    movePlayer(dx, dy, dt);
    updatePlayerAnimation(dt);

    state.near = null;
    if (state.scene === 'outdoor') {
      let nearest = 74;
      for (const location of outdoor.locations) {
        const distance = Math.hypot(state.player.x - location.x, state.player.y - location.y);
        if (distance < nearest) { nearest = distance; state.near = { kind: 'location', location }; }
      }
    } else {
      const exitDistance = Math.hypot(state.player.x - 320, state.player.y - 420);
      if (exitDistance < 72) state.near = { kind: 'exit' };
      const map = data[state.scene];
      for (const sign of map.signs || []) {
        const index = map.signs.indexOf(sign);
      }
    }
    if (prompt) {
      prompt.hidden = !state.near;
      prompt.querySelector('span').textContent = state.near?.kind === 'exit' ? 'Return outside' : 'Explore location';
    }
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function strokeRect(x, y, w, h, color, line = 2) { ctx.strokeStyle = color; ctx.lineWidth = line; ctx.strokeRect(Math.round(x)+line/2, Math.round(y)+line/2, Math.round(w)-line, Math.round(h)-line); }

  function pixelTree(x, y, time) {
    const sway = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(time / 900 + x) * 1.2;
    rect(x-4, y+14, 8, 20, '#5C4A38');
    rect(x-18, y-12, 36, 32, '#3E6650');
    rect(x-13, y-18+sway, 26, 14, '#557958');
    rect(x-8, y-22+sway, 16, 8, '#6F8B68');
    rect(x-14, y+2, 8, 12, '#345542');
    rect(x+7, y+4, 7, 12, '#4A704E');
    rect(x-10, y-7, 4, 4, '#91A37A');
  }

  function pixelBush(x, y) {
    rect(x-18, y+6, 36, 18, '#4D704E');
    rect(x-12, y-4, 24, 20, '#5E8058');
    rect(x-6, y-9, 12, 10, '#718B62');
    rect(x-16, y+10, 5, 5, '#81956F');
  }

  function pixelFlower(x, y, color) {
    rect(x-2, y+2, 4, 8, '#557258');
    rect(x-5, y-3, 10, 7, color); rect(x-2, y-6, 4, 4, '#F1E5BE');
  }

  function drawBuilding(location) {
    const { x, y } = location;
    const left = x - 95, top = y - 86;
    rect(left+8, top+100, 190, 18, '#9B8C70');
    rect(left+18, top+18, 154, 88, '#D8CBA9'); strokeRect(left+18, top+18, 154, 88, '#514B3F');
    rect(left, top, 190, 32, location.id === 'workshop' ? '#A85F47' : '#7A6751');
    for (let i=0;i<190;i+=16) { rect(left+i, top, 11, 32, i%32 ? '#B66D52' : '#9A6048'); strokeRect(left+i, top, 11,32,'#684E41',1); }
    rect(left+73, top+74, 44, 32, '#4C5E51'); strokeRect(left+73, top+74,44,32,'#354239');
    rect(left+82, top+80,26,26, location.id === 'workshop' ? '#6F8F7E' : '#D7B96D');
    rect(left+31, top+44,34,26,'#81958D'); strokeRect(left+31,top+44,34,26,'#53665F');
    rect(left+125,top+44,34,26,'#81958D'); strokeRect(left+125,top+44,34,26,'#53665F');
    rect(left+78, top+122,34,10, '#A5A06F');
    rect(left+68, top+132,54,8, '#6E7158');

    ctx.fillStyle = '#2F372F'; ctx.font = '600 10px "DM Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(location.name.toUpperCase(), x, top+154);
  }

  function drawPlayer(cameraX = 0, cameraY = 0) {
    const p = state.player;
    const directionRow = { down: 0, up: 1, left: 2, right: 3 }[p.dir] ?? 0;
    const sheet = p.animation === 'walk' ? sprites.walk : sprites.idle;
    const loaded = p.animation === 'walk' ? sprites.walkLoaded : sprites.idleLoaded;
    if (!loaded) return;

    const sourceFrame = p.animation === 'walk'
      ? Math.max(0, Math.min(5, p.frame))
      : Math.max(0, Math.min(1, p.frame));
    const sourceX = sourceFrame * 64;
    const sourceY = directionRow * 96;
    const scale = state.scene === 'outdoor' ? outdoor.scale : 1;
    const artX = p.x / scale;
    const artY = p.y / scale;
    const renderWidth = 48;
    const renderHeight = 72;
    const drawX = Math.round(artX - renderWidth / 2 - cameraX);
    // Both sprite sheets end at source row 90, with six transparent rows below the boots.
    const footOffset = renderHeight * 90 / 96;
    const drawY = Math.round(artY - footOffset - cameraY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheet,
      sourceX, sourceY, 64, 96,
      drawX, drawY, renderWidth, renderHeight
    );
    ctx.restore();
  }

  function drawMossLayers(cameraX, cameraY, viewW, viewH, frame, offsetX = 0, offsetY = 0) {
    ctx.drawImage(mossBase, cameraX, cameraY, viewW, viewH, offsetX, offsetY, viewW, viewH);
    if (!motionPreference.matches && state.moss.atlasLoaded) {
      const { frameHeight, tileSize } = state.moss.manifest.atlas;
      const { grid, gridColumns, sources } = state.moss.tiles;
      const firstColumn = Math.floor(cameraX / tileSize);
      const lastColumn = Math.floor((cameraX + viewW - 1) / tileSize);
      const firstRow = Math.floor(cameraY / tileSize);
      const lastRow = Math.floor((cameraY + viewH - 1) / tileSize);
      const frameY = frame * frameHeight;
      for (let row = firstRow; row <= lastRow; row++) {
        const rowStart = row * gridColumns;
        for (let column = firstColumn; column <= lastColumn; column++) {
          const index = grid[rowStart + column];
          if (!index) continue;
          const { x, y, sx, sy, runLength } = sources[index - 1];
          const count = Math.min(runLength, lastColumn - column + 1);
          const width = count * tileSize;
          ctx.drawImage(mossAtlas, sx, frameY + sy, width, tileSize,
            x - cameraX + offsetX, y - cameraY + offsetY, width, tileSize);
          column += count - 1;
        }
      }
    }
  }

  function drawBridgeForeground(cameraX, cameraY, viewW, viewH, frame) {
    const playerX = state.player.x / outdoor.scale;
    const playerY = state.player.y / outdoor.scale;
    for (const { feet, outlines, bounds } of outdoor.bridgeForeground) {
      if (!inRect(playerX, playerY, feet)) continue;
      const left = Math.max(cameraX, bounds[0]);
      const top = Math.max(cameraY, bounds[1]);
      const right = Math.min(cameraX + viewW, bounds[2]);
      const bottom = Math.min(cameraY + viewH, bounds[3]);
      if (left >= right || top >= bottom) continue;
      ctx.save();
      ctx.beginPath();
      for (const [[x, y], ...points] of outlines) {
        ctx.moveTo(x - cameraX, y - cameraY);
        for (const [pointX, pointY] of points) ctx.lineTo(pointX - cameraX, pointY - cameraY);
        ctx.closePath();
      }
      ctx.clip();
      drawMossLayers(left, top, right - left, bottom - top, frame, left - cameraX, top - cameraY);
      ctx.restore();
    }
  }

  function drawOutdoor(cameraX, cameraY, viewW, viewH) {
    if (!outdoor || !state.moss.baseLoaded) {
      rect(0, 0, viewW, viewH, '#1D3028');
      ctx.fillStyle = '#91A578';
      ctx.font = '700 24px ui-monospace, monospace';
      ctx.fillText('Mossbound Forest', 24, 64);
      return;
    }

    const frame = ambientFrame();
    canvas.dataset.ambientFrame = String(frame);
    drawMossLayers(cameraX, cameraY, viewW, viewH, frame);
    drawPlayer(cameraX, cameraY);
    drawBridgeForeground(cameraX, cameraY, viewW, viewH, frame);
  }

  function drawInterior(kind, time) {
    const map = data[kind];
    rect(0,0,map.bounds.w,map.bounds.h,kind === 'study' ? '#C9BE9F' : '#CFC4A7');
    for(let y=34;y<446;y+=32) for(let x=34;x<606;x+=32) rect(x,y,32,32,(x+y)%64?'#D4C9AA':'#CBBE9B');
    rect(34,34,572,64,kind === 'workshop' ? '#9A6048' : '#806F52');
    for(let i=48;i<590;i+=48) { rect(i,48,32,38,'#BBAF90'); strokeRect(i,48,32,38,'#6A604E'); }

    rect(88,98,464,32,'#6F604A');
    if(kind === 'study') {
      rect(112,112,416,18,'#9B7B55');
      for(let i=126;i<510;i+=30) rect(i,116,18,10,i%60?'#D9AE65':'#81906A');
      rect(170,220,300,62,'#A88F6E'); rect(190,232,260,38,'#E1D2A8');
    } else if(kind === 'workshop') {
      rect(170,210,300,82,'#6E7158'); strokeRect(170,210,300,82,'#4D513C');
      rect(188,224,264,54,'#2F372F'); rect(202,238,90,26,'#6F8F7E'); rect(306,238,130,26,'#BDAF91');
    } else {
      rect(160,230,320,86,'#A88F6E');
      rect(182,242,84,62,'#426551'); rect(278,242,84,62,'#BD7356'); rect(374,242,84,62,'#81906A');
      [182,278,374].forEach((x) => { rect(x+22,254,40,18,'#E1D2A8'); });
    }

    rect(296,420,48,26,'#65735E'); strokeRect(296,420,48,26,'#354239'); rect(308,426,24,20,'#E1D2A8');
    drawPlayer();
  }

  function resizeCanvas() {
    render(performance.now());
  }

  function render(time) {
    syncDebugState();
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    let logicalW;
    let logicalH;
    if (state.scene === 'outdoor') {
      const aspect = cssWidth / Math.max(1, cssHeight);
      logicalW = Math.round(Math.max(240, Math.min(760, 400 * aspect)));
      logicalH = 400;
      if (aspect < 1) logicalW = Math.round(Math.max(240, Math.min(400, 400 * aspect)));
    } else {
      logicalW = 640;
      logicalH = 480;
    }
    let cameraX = 0;
    let cameraY = 0;
    if (state.scene === 'outdoor' && outdoor) {
      const playerArtX = state.player.x / outdoor.scale;
      const playerArtY = state.player.y / outdoor.scale;
      cameraX = Math.max(0, Math.min(outdoor.artWidth - logicalW, Math.round(playerArtX - logicalW / 2)));
      cameraY = Math.max(0, Math.min(outdoor.artHeight - logicalH, Math.round(playerArtY - logicalH / 2)));
    }

    if (canvas.width !== logicalW || canvas.height !== logicalH) {
      canvas.width = logicalW;
      canvas.height = logicalH;
    }
    canvas.style.width = '100vw';
    canvas.style.height = '100dvh';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, logicalW, logicalH);
    if (state.scene === 'outdoor') {
      drawOutdoor(cameraX, cameraY, logicalW, logicalH);
    } else {
      drawInterior(state.scene, time);
    }
  }

  function setStory(title, text) {
    if (!story || !storyTitle || !storyText) return;
    storyTitle.textContent = title;
    storyText.textContent = text;
    story.classList.remove('story-enter'); void story.offsetWidth; story.classList.add('story-enter');
  }

  function enterLocation(location) {
    state.scene = location.scene;
    state.player.x = data[state.scene].spawn.x;
    state.player.y = data[state.scene].spawn.y;
    setStory(location.name, location.detail);
  }

  function leaveLocation() {
    state.scene = 'outdoor';
    Object.assign(state.player, outdoor.spawn);
    setStory(arrivalStory.title, arrivalStory.text);
  }

  function interact() {
    if (state.textOpen) return;
    if (state.scene !== 'outdoor') {
      if (Math.hypot(state.player.x-320,state.player.y-420)<72) leaveLocation();
      else if (state.scene === 'study') setStory('Learning Study','Education and learning are represented by books, notes, and a quiet reading table. Verified qualifications remain in the text view until supplied.');
      else if (state.scene === 'workshop') setStory('Developer Workshop','The desk, terminal, and tool wall reflect practical work in HTML, CSS, JavaScript, Git, and GitHub.');
      else setStory('Project Terrace','The three displays represent Project 1, Hour of Code, and Robotics. Project details remain available from the Projects page.');
      return;
    }
    if (!state.near || state.near.kind !== 'location') return;
    enterLocation(state.near.location);
  }

  function keydown(event) {
    const movement = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyE','Escape','KeyM'];
    if (!movement.includes(event.code)) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;

    if (state.textOpen) {
      if (event.code === 'Escape' && !event.repeat) toggleText(false);
      return;
    }

    const mapOpen = !document.querySelector('#world-map').hidden;
    if (mapOpen) {
      if (event.code === 'Escape' && !event.repeat) toggleMap();
      if (event.code === 'KeyM' && !event.repeat) toggleMap();
      return;
    }

    const target = event.target;
    const gameFocus = target === canvas || target === document.body || target === document.documentElement;
    if (!gameFocus && target?.tagName === 'BUTTON') return;

    if (event.code.startsWith('Arrow')) event.preventDefault();
    if (event.code === 'KeyE' && !event.repeat) interact();
    else if (!event.repeat && event.code === 'KeyM') toggleMap();
    else state.keys.add(event.code);
  }
  function keyup(event) { state.keys.delete(event.code); }

  function toggleText(open) {
    clearInput();
    const panel = document.querySelector('#text-view');
    state.textOpen = typeof open === 'boolean' ? open : panel.hidden;
    panel.hidden = !state.textOpen;
    document.querySelector('#text-view-toggle').setAttribute('aria-expanded', String(state.textOpen));
    if (state.textOpen) document.querySelector('#text-view-close').focus(); else canvas.focus();
  }
  function toggleMap(open) {
    const panel = document.querySelector('#world-map');
    const shouldOpen = typeof open === 'boolean' ? open : panel.hidden;
    panel.hidden = !shouldOpen;
    document.querySelector('#map-toggle').setAttribute('aria-expanded', String(shouldOpen));
    if (!shouldOpen) canvas.focus();
  }

  document.querySelector('#text-view-toggle')?.addEventListener('click', () => toggleText());
  document.querySelector('#text-view-close')?.addEventListener('click', () => toggleText(false));
  document.querySelector('#map-toggle')?.addEventListener('click', toggleMap);
  document.querySelector('#world-map-close')?.addEventListener('click', () => toggleMap(false));
  document.querySelector('[data-mobile-interact]')?.addEventListener('click', interact);

  document.querySelectorAll('[data-pad]').forEach(button => {
    const direction = button.dataset.pad;
    const start = event => { event.preventDefault(); state.pad.add(direction); };
    const stop = event => { event.preventDefault(); state.pad.delete(direction); };
    button.addEventListener('pointerdown', start); button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop); button.addEventListener('pointerleave', stop);
  });

  window.addEventListener('keydown', keydown, { passive: false });
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearInput);
  window.addEventListener('pagehide', clearInput);
  document.addEventListener('visibilitychange', () => {
    clearInput();
    state.last = performance.now();
  });
  canvas.addEventListener('pointerdown', () => canvas.focus());
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(state.raf); state.raf = 0; clearInput();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && state.raf === 0) {
      state.last = performance.now();
      state.raf = requestAnimationFrame(loop);
    }
  });

  document.querySelectorAll('[data-map-region]').forEach(button => button.addEventListener('click', () => {
    if (!outdoor) return;
    const region = button.dataset.mapRegion;
    if (region === 'arrival') leaveLocation();
    else {
      const location = outdoor.locations.find(item => item.id === region);
      if (location) enterLocation(location);
    }
    toggleMap(false);
  }));

  fetch('public/data/profile.json').then(r => r.ok?r.json():null).then(profile => {
    if (!profile) return;
    document.querySelector('#text-biography').textContent = profile.extendedBiography || '';
    document.querySelector('#text-skills').innerHTML = (profile.technicalSkills || []).map(skill => `<span class="skill-chip">${skill}</span>`).join('');
  }).catch(()=>{});

  resizeCanvas();
  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(canvas);
  state.resizeObserver = observer;

  function loop(time) {
    const elapsed = Math.max(0, time - state.last);
    state.last = time;
    if (!document.hidden && !motionPreference.matches && state.moss.atlasLoaded) {
      const { frameCount, frameMs } = state.moss.manifest;
      state.moss.ambientElapsed = (state.moss.ambientElapsed + elapsed) % (frameCount * frameMs);
    }
    update(Math.min(elapsed / 1000, 0.05));
    render(time);
    state.raf = requestAnimationFrame(loop);
  }
  canvas.focus();
  state.raf = requestAnimationFrame(loop);
})();
