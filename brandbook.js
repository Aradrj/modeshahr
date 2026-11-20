/* ==========================================================================
   MODESHAHR BRAND BOOK — Interactive Animations, Scroll Spy, Lightbox & Swatch Copy
   ========================================================================== */
(function () {
  const progressBar = document.getElementById('bbProgressBar');
  const revealEls = Array.from(document.querySelectorAll('.bb-reveal'));
  const navLinks = Array.from(document.querySelectorAll('.bb-chapter-nav a'));
  const sections = Array.from(document.querySelectorAll('section[data-bb-chapter]'));
  const toastEl = document.getElementById('bbToast');
  const lightbox = document.getElementById('bbLightbox');
  const lightboxImg = document.getElementById('bbLightboxImg');
  const lightboxCaption = document.getElementById('bbLightboxCaption');
  const lightboxClose = document.getElementById('bbLightboxClose');

  // 1. Reading progress bar
  function updateProgress() {
    if (!progressBar) return;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? Math.min(100, Math.max(0, (window.scrollY / docH) * 100)) : 0;
    progressBar.style.width = pct.toFixed(1) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // 2. Smooth scroll-reveal animation (respects prefers-reduced-motion)
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    const revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  // 3. Chapter navigation active state (Scroll Spy)
  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const spyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.35 });

    sections.forEach(function (sec) { spyObs.observe(sec); });
  }

  // 4. Interactive color swatch HEX copy
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-show');
    }, 2200);
  }

  function copyHex(hex) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(function () {
        showToast('کد رنگ ' + hex + ' کپی شد');
      }).catch(function () {
        showToast('کد رنگ: ' + hex);
      });
    } else {
      showToast('کد رنگ: ' + hex);
    }
  }

  Array.from(document.querySelectorAll('[data-copy-hex]')).forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      const hex = swatch.getAttribute('data-copy-hex');
      if (hex) copyHex(hex);
    });
    swatch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const hex = swatch.getAttribute('data-copy-hex');
        if (hex) copyHex(hex);
      }
    });
  });

  // 5. Editorial Lightbox for all fashion artwork images
  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    if (lightboxCaption) lightboxCaption.textContent = alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  Array.from(document.querySelectorAll('.bb-zoomable')).forEach(function (box) {
    box.addEventListener('click', function () {
      const img = box.querySelector('img');
      if (img && img.src) openLightbox(img.src, img.alt);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const img = box.querySelector('img');
        if (img && img.src) openLightbox(img.src, img.alt);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
})();

// Shared footer back-to-top button
(function () {
  var btn = document.getElementById('footerBackTopBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
