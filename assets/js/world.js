(() => {
  const canvas = document.querySelector('#portfolio-world');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const panel = document.querySelector('#world-panel');
  const panelTitle = document.querySelector('#world-panel-title');
  const panelBody = document.querySelector('#world-panel-body');
  const closePanel = document.querySelector('#world-panel-close');
  const status = document.querySelector('#world-status');
  const progress = document.querySelector('#world-progress');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const storageKey = 'portfolio-world-progress-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { saved = {}; }
  const state = {
    version: 1,
    discovered: new Set(saved.discovered || []),
    artifacts: new Set(saved.artifacts || []),
    achievements: new Set(saved.achievements || []),
    energy: Boolean(saved.energy),
    signalSolved: Boolean(saved.signalSolved),
    robotSolved: Boolean(saved.robotSolved)
  };

  const regions = [
    { id: 'arrival', name: 'Arrival', x: 480, y: 280, color: '#A5E8C5' },
    { id: 'education', name: 'Learning', x: 190, y: 190, color: '#A8B4FA' },
    { id: 'projects', name: 'Project Lab', x: 770, y: 190, color: '#EAC18A' },
    { id: 'library', name: 'Archive', x: 190, y: 410, color: '#79C7D9' },
    { id: 'future', name: 'Future', x: 770, y: 410, color: '#D69BC9' }
  ];
  const player = { x: 480, y: 280, targetX: 480, targetY: 280, facing: 1, frame: 0 };
  let projects = [];
  let articles = [];
  let profile = null;

  Promise.all([
    fetch('public/data/projects.json').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('public/data/articles.json').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('public/data/profile.json').then(r => r.ok ? r.json() : null).catch(() => null)
  ]).then(([p, a, f]) => { projects = p; articles = a; profile = f; });

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify({
      version: 1, discovered: [...state.discovered], artifacts: [...state.artifacts],
      achievements: [...state.achievements], energy: state.energy,
      signalSolved: state.signalSolved, robotSolved: state.robotSolved
    }));
    updateProgress();
  }

  function updateProgress() {
    const total = regions.length + 3;
    const count = state.discovered.size + state.artifacts.size + state.achievements.size;
    progress.textContent = `${Math.min(count, total)} / ${total}`;
  }

  function achievement(id, label) {
    if (state.achievements.has(id)) return;
    state.achievements.add(id);
    status.textContent = `Achievement: ${label}`;
    persist();
  }

  function discover(id) {
    state.discovered.add(id);
    persist();
  }

  function openPanel(title, body) {
    panelTitle.textContent = title;
    panelBody.innerHTML = body;
    panel.hidden = false;
    panel.classList.add('open');
    closePanel.focus();
  }
  closePanel.addEventListener('click', () => { panel.hidden = true; panel.classList.remove('open'); });

  function isometricPoint(x, y) {
    return { x: canvas.width / 2 + (x - canvas.height / 2) * 0.86, y: y * 0.76 + 70 };
  }

  function drawDiamond(cx, cy, w, h, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy); ctx.lineTo(cx, cy + h / 2); ctx.lineTo(cx - w / 2, cy); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawPixelBuilding(cx, cy, color, label) {
    ctx.fillStyle = '#090B0E'; ctx.fillRect(cx - 37, cy - 48, 74, 48);
    ctx.fillStyle = color; ctx.fillRect(cx - 32, cy - 43, 64, 38);
    ctx.fillStyle = '#101216'; ctx.fillRect(cx - 24, cy - 31, 48, 26);
    ctx.fillStyle = '#A5E8C5'; ctx.fillRect(cx - 16, cy - 23, 32, 12);
    ctx.fillStyle = '#F3F4F6'; ctx.font = '600 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(label, cx, cy + 32);
  }

  function drawWorld(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save(); ctx.translate(0, 20);
    for (let y = 80; y < 520; y += 54) {
      for (let x = 90; x < 870; x += 54) {
        ctx.globalAlpha = ((x + y) % 108 === 0) ? 0.55 : 0.32;
        drawDiamond(x, y, 64, 48, ((x / 54 + y / 54) % 2) ? '#171C22' : '#14181D', '#252C35');
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;

    const positions = [
      { cx: 190, cy: 205, c: '#A8B4FA', n: 'LEARNING' },
      { cx: 770, cy: 205, c: '#EAC18A', n: 'LAB' },
      { cx: 190, cy: 410, c: '#79C7D9', n: 'ARCHIVE' },
      { cx: 770, cy: 410, c: '#D69BC9', n: 'FUTURE' }
    ];
    positions.forEach(b => drawPixelBuilding(b.cx, b.cy, b.c, b.n));

    drawPixelBuilding(480, 300, state.energy ? '#A5E8C5' : '#48544F', 'ARRIVAL');

    const bob = reduceMotion ? 0 : Math.sin(time / 700) * 3;
    ctx.fillStyle = '#A5E8C5'; ctx.fillRect(296, 300 + bob, 18, 18);
    ctx.fillStyle = '#101216'; ctx.fillRect(301, 305 + bob, 8, 8);
    ctx.fillStyle = '#A8B4FA'; ctx.fillRect(684, 300 - bob, 18, 18);

    if (state.energy) {
      ctx.globalAlpha = reduceMotion ? 0.8 : 0.55 + Math.sin(time / 260) * 0.2;
      ctx.fillStyle = '#A5E8C5'; ctx.fillRect(0, 0, canvas.width, canvas.height / 9);
      ctx.globalAlpha = 1;
    }

    player.frame += 0.02;
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      player.x += dx * 0.035; player.y += dy * 0.035;
    }
    ctx.fillStyle = '#090B0E'; ctx.fillRect(player.x - 16, player.y - 5, 32, 22);
    ctx.fillStyle = '#F3F4F6'; ctx.fillRect(player.x - 11, player.y - 18, 22, 28);
    ctx.fillStyle = '#A5E8C5'; ctx.fillRect(player.x - 7, player.y - 15, 14, 8);
    ctx.fillStyle = '#101216'; ctx.fillRect(player.x - 5, player.y - 10, 10, 4);

    requestAnimationFrame(drawWorld);
  }

  function regionFromPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return Math.hypot(x - player.targetX, y - player.targetY);
  }

  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    player.targetX = Math.max(70, Math.min(canvas.width - 70, (event.clientX - rect.left) * canvas.width / rect.width));
    player.targetY = Math.max(100, Math.min(canvas.height - 50, (event.clientY - rect.top) * canvas.height / rect.height));
    regionFromPoint(event.clientX, event.clientY);
    status.textContent = 'Exploring the world';
  });

  window.addEventListener('keydown', event => {
    const step = 18;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') player.targetX -= step;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') player.targetX += step;
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') player.targetY -= step;
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') player.targetY += step;
  });

  function regionContent(id) {
    if (id === 'education') {
      discover('education');
      achievement('explorer', 'First region discovered');
      openPanel('Learning district', `<p>${profile?.extendedBiography || 'My learning and education information will appear here.'}</p><p><strong>Skills</strong></p><div>${(profile?.technicalSkills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>`);
    }
    if (id === 'projects') {
      discover('projects');
      const featured = projects.slice(0, 5);
      openPanel('Project lab', `<p>Real projects from this portfolio are synchronized from the shared project dataset.</p>${featured.map(p => `<article class="world-project"><strong>${p.title}</strong><span>${p.description || 'Description pending.'}</span>${p.links?.repository ? `<a href="${p.links.repository}" target="_blank" rel="noreferrer">Open repository ↗</a>` : ''}</article>`).join('')}<p><a href="projects.html">View complete project gallery →</a></p>`);
    }
    if (id === 'library') {
      discover('library');
      const list = articles.length ? articles.slice(0, 4).map(a => `<a class="world-link" href="blog/${a.slug}/">${a.title}<span>${a.description || ''}</span></a>`).join('') : '<p>No published articles yet. This archive is ready for future Markdown publications.</p>';
      openPanel('Archive', list);
    }
    if (id === 'future') {
      discover('future');
      openPanel('Future workspace', '<p>I am interested in continuing to learn through practical systems, software, and collaborative work. Verified goals and interests can be maintained in the centralized profile source.</p><button class="world-action" type="button" data-artifact="future">Collect memory fragment</button>');
    }
    if (id === 'arrival') {
      discover('arrival');
      openPanel('Arrival terminal', `<p><strong>${profile?.name || 'Rashad Isayev'}</strong></p><p>${profile?.shortIntroduction || ''}</p><button class="world-action" id="energy-toggle" type="button">${state.energy ? 'Switch power off' : 'Switch power on'}</button><p class="world-feedback" id="world-feedback" aria-live="polite">${state.energy ? 'The project lab is illuminated.' : 'The local simulation is idle.'}</p>`);
    }
  }

  document.querySelectorAll('[data-region]').forEach(button => button.addEventListener('click', () => {
    const region = regions.find(r => r.id === button.dataset.region);
    if (!region) return;
    player.targetX = region.x; player.targetY = region.y;
    setTimeout(() => regionContent(region.id), 350);
  }));

  panel.addEventListener('click', event => {
    const energy = event.target.closest('#energy-toggle');
    if (energy) {
      state.energy = !state.energy;
      energy.textContent = state.energy ? 'Switch power off' : 'Switch power on';
      const feedback = document.querySelector('#world-feedback');
      if (feedback) feedback.textContent = state.energy ? 'The project lab is illuminated.' : 'The local simulation is idle.';
      achievement('energy', 'Power system operated');
      persist();
    }
    const artifact = event.target.closest('[data-artifact]');
    if (artifact) {
      state.artifacts.add('future-memory');
      achievement('artifact', 'Memory fragment found');
      artifact.textContent = 'Memory fragment collected'; artifact.disabled = true;
      persist();
    }
  });

  document.querySelector('#signal-toggle')?.addEventListener('click', () => {
    state.signalSolved = true;
    document.querySelector('#signal-node').classList.add('active');
    document.querySelector('#signal-feedback').textContent = 'Signal verified: source connected to destination.';
    achievement('signal', 'Signal routed');
    persist();
  });

  document.querySelector('#robot-run')?.addEventListener('click', () => {
    state.robotSolved = true;
    const bot = document.querySelector('#world-robot');
    bot.classList.remove('run'); void bot.offsetWidth; bot.classList.add('run');
    document.querySelector('#robot-feedback').textContent = 'Sequence complete: RIGHT → RIGHT → INTERACT.';
    achievement('robot', 'Sequence executed');
    persist();
  });

  document.querySelector('#world-reset')?.addEventListener('click', () => {
    if (!confirm('Reset discoveries and interactions for this portfolio world?')) return;
    localStorage.removeItem(storageKey);
    location.reload();
  });

  updateProgress();
  requestAnimationFrame(drawWorld);
})();
