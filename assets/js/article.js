(() => {
  const article = document.querySelector('.article-page');
  if (!article) return;

  const shareButton = document.querySelector('#article-share');
  const copyButton = document.querySelector('#article-copy');
  const feedback = document.querySelector('#article-action-feedback');
  const title = article.dataset.articleTitle || document.title;
  const url = article.dataset.articleUrl || window.location.href;

  function announce(message) {
    if (!feedback) return;
    feedback.textContent = message;
  }

  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Copy command was rejected');
      }
      announce('Link copied');
      if (copyButton) {
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy link'; }, 1800);
      }
    } catch {
      announce('Could not copy. You can copy the address from the browser.');
    }
  }

  copyButton?.addEventListener('click', copyLink);

  shareButton?.addEventListener('click', async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: title, url });
      announce('Share opened');
    } catch (error) {
      if (error?.name === 'AbortError') {
        announce('Share cancelled');
      } else {
        announce('Sharing unavailable. Use Copy link instead.');
      }
    }
  });

  async function copyCode(code) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
      return;
    }
    const input = document.createElement('textarea');
    input.value = code;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Copy command was rejected');
  }

  document.querySelectorAll('.code-block').forEach((block) => {
    const button = block.querySelector('[data-copy-code]');
    button?.addEventListener('click', async () => {
      const code = block.querySelector('code')?.innerText || '';
      try {
        await copyCode(code);
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy code'; }, 1800);
      } catch {
        button.textContent = 'Unable to copy';
      }
    });
  });

  const progressBar = document.querySelector('#reading-progress-bar');
  if (progressBar && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      progressBar.style.width = `${percent}%`;
    };
    addEventListener('scroll', update, { passive: true });
    update();
  } else if (progressBar) {
    progressBar.style.display = 'none';
  }
})();
