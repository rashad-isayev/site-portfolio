document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('open', !open);
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const quests = document.querySelectorAll('.quest');
const xpValue = document.querySelector('#xp-value');
const xpBar = document.querySelector('#xp-bar');
const questMessage = document.querySelector('#quest-message');
if (quests.length && xpValue && xpBar && questMessage) {
  quests.forEach((quest) => {
    quest.addEventListener('click', () => {
      quests.forEach((item) => item.classList.remove('active'));
      quest.classList.add('active');
      const xp = Number(quest.dataset.xp);
      xpValue.textContent = xp;
      xpBar.style.width = `${xp}%`;
      const title = quest.querySelector('strong').textContent;
      questMessage.textContent = `Quest selected: ${title}`;
    });
  });
}

const scriptUrl = [...document.scripts].find((script) => script.src.endsWith('/assets/js/main.js'))?.src;
const dataBase = scriptUrl ? new URL('../../', scriptUrl).toString() : './';

async function fetchJson(file) {
  const response = await fetch(new URL(`public/data/${file}`, dataBase));
  if (!response.ok) throw new Error(`Could not load ${file}`);
  return response.json();
}

fetchJson('profile.json').then((profile) => {
  const introduction = document.querySelector('#profile-introduction');
  const biography = document.querySelector('#about-biography');
  if (introduction && profile.shortIntroduction) introduction.textContent = profile.shortIntroduction;
  if (biography && profile.extendedBiography) biography.textContent = profile.extendedBiography;
  const skills = document.querySelector('#profile-skills');
  if (skills && Array.isArray(profile.technicalSkills)) {
    skills.innerHTML = profile.technicalSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('');
  }
}).catch(() => {});

const projectList = document.querySelector('#dynamic-project-list');
if (projectList) {
  const search = document.querySelector('#project-search');
  const filter = document.querySelector('#project-filter');
  let projects = [];

  const renderProjects = () => {
    const term = search?.value.toLower?.().trim() || '';
    const category = filter?.value || 'all';
    const visible = projects.filter((project) => {
      const searchable = [project.title, project.description, project.category, ...(project.technologies || [])].join(' ').toLowerCase();
      return (category === 'all' || project.category === category) && (!term || searchable.includes(term));
    });
    projectList.innerHTML = visible.length ? visible.map((project) => `
      <article class="project-card">
        <div class="project-image dynamic-project-image"><span>${project.title.slice(0, 1)}</span></div>
        <div class="project-meta"><span>${project.category}</span><span>${(project.technologies || []).slice(0, 3).join(' · ')}</span></div>
        <h2>${project.title}</h2>
        <p>${project.description || 'Description not yet provided.'}</p>
        ${project.links?.repository ? `<a class="text-link" href="${project.links.repository}" target="_blank" rel="noreferrer">Repository ↗</a>` : ''}
      </article>`).join('') : '<p class="empty-state">No projects match these filters.</p>';
  };

  fetchJson('projects.json').then((data) => {
    projects = data;
    if (filter) {
      const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))];
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === 'github' ? 'GitHub repositories' : category;
        filter.append(option);
      });
    }
    renderProjects();
  }).catch(() => { projectList.innerHTML = '<p class="empty-state">Project data is temporarily unavailable.</p>'; });
  search?.addEventListener('input', renderProjects);
  filter?.addEventListener('change', renderProjects);
}

const articleList = document.querySelector('#article-list');
if (articleList) {
  const search = document.querySelector('#article-search');
  const category = document.querySelector('#article-category');
  let articles = [];

  const renderArticles = () => {
    const term = search?.value?.trim().toLowerCase() || '';
    const selectedCategory = category?.value || 'all';
    const visible = articles.filter((article) => {
      const searchable = [article.title, article.description, article.category, ...(article.tags || [])].join(' ').toLowerCase();
      return (!term || searchable.includes(term)) && (selectedCategory === 'all' || article.category === selectedCategory);
    });
    if (!articles.length) { articleList.innerHTML = '<p class="empty-state">No published articles yet.</p>'; return; }
    articleList.innerHTML = visible.length ? visible.map((article) => `
      <article class="article-card"><p class="eyebrow">${article.category || 'Article'} · ${article.readingMinutes} min read</p>
      <h2><a href="${new URL(`blog/${article.slug}/`, dataBase).pathname}">${article.title}</a></h2>
      <p>${article.description || ''}</p><time datetime="${article.date}">${article.date}</time></article>`).join('') : '<p class="empty-state">No published articles match these filters.</p>';
  };

  fetchJson('articles.json').then((data) => {
    articles = data;
    if (category) {
      [...new Set(articles.map((article) => article.category).filter(Boolean))].sort().forEach((name) => {
        const option = document.createElement('option'); option.value = name; option.textContent = name; category.append(option);
      });
    }
    renderArticles();
  }).catch(() => { articleList.innerHTML = '<p class="empty-state">No published articles yet.</p>'; });
  search?.addEventListener('input', renderArticles);
  category?.addEventListener('change', renderArticles);
}
