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
