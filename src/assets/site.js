(() => {
  const STORAGE_KEY = 'sn-theme';
  const root = document.documentElement;
  const themeButton = document.getElementById('theme');

  const SUN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  const MOON_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function normalizeTheme(value) {
    return value === 'light' ? 'light' : 'dark';
  }

  function applyTheme(mode, persist) {
    const theme = normalizeTheme(mode);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Ignore storage errors in restricted environments
      }
    }

    if (themeButton) {
      const next = theme === 'light' ? 'dark' : 'light';
      const label = next === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
      themeButton.setAttribute('aria-label', label);
      themeButton.setAttribute('title', label);
      themeButton.setAttribute('aria-pressed', String(theme === 'light'));
      themeButton.innerHTML = theme === 'light' ? MOON_ICON : SUN_ICON;
    }
  }

  let initial = 'dark';
  try {
    initial = normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    initial = normalizeTheme(root.dataset.theme);
  }
  applyTheme(initial, false);

  if (themeButton) {
    themeButton.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next, true);
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(event.newValue, false);
    }
  });

  const menu = document.getElementById('menu');
  const navLinks = document.getElementById('navLinks');
  if (menu && navLinks) {
    menu.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.textContent = open ? '×' : '☰';
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', 'Open navigation');
        menu.textContent = '☰';
      });
    });
  }

  const revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
          }
        });
      },
      { threshold: 0.08 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('show'));
  }

  const progress = document.getElementById('progress');
  if (progress) {
    const updateProgress = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      progress.style.width = maxScroll > 0 ? `${(doc.scrollTop / maxScroll) * 100}%` : '0%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  if (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  const contactForm = document.getElementById('contactForm');
  const statusEl = document.getElementById('status');
  if (contactForm && statusEl) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const rawName = String(formData.get('name') || '').trim();
      const firstName = rawName.split(/\s+/)[0];
      statusEl.textContent = firstName
        ? `Thanks, ${firstName} — your audit request has been received.`
        : 'Thanks — your audit request has been received.';
      contactForm.reset();
    });
  }
})();
