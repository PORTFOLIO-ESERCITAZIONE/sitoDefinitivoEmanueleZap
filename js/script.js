/* =============================================
   HAMBURGER — chiudi il menu al click su un link (mobile)
   ============================================= */
document.querySelectorAll('.navbar-nav .nav-link').forEach(function (link) {
  link.addEventListener('click', function () {
    const navbarCollapse = document.getElementById('navbarMain');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
      if (bsCollapse) bsCollapse.hide();
    }
  });
});

/* =============================================
   NAVBAR — ombra allo scroll
   ============================================= */
const mainNav = document.getElementById('mainNav');
if (mainNav) {
  window.addEventListener('scroll', function () {
    mainNav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* =============================================
   COUNT-UP — animazione numeri statistiche
   ============================================= */
(function () {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  let animated = false;

  function animateCounters() {
    counters.forEach(function (el) {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (!Number.isFinite(target) || target < 0) return;
      const suffix   = el.getAttribute('data-suffix') || '';
      const duration = target >= 100 ? 1800 : 1200;
      let start      = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  const observer = new IntersectionObserver(function (entries) {
    if (!animated && entries[0].isIntersecting) {
      animated = true;
      animateCounters();
    }
  }, { threshold: 0.3 });

  const section = document.getElementById('risultati');
  if (section) observer.observe(section);
})();

/* =============================================
   CAROUSEL — dot, progress bar, pausa su hover
   ============================================= */
(function () {
  const carousel = document.getElementById('ebookCarousel');
  if (!carousel) return;

  /* sincronizza dot custom */
  carousel.addEventListener('slid.bs.carousel', function (e) {
    document.querySelectorAll('.c-dot').forEach(function (dot, i) {
      dot.classList.toggle('active', i === e.to);
    });
  });

  /* progress bar */
  const progressBar = document.getElementById('carouselProgress');
  if (progressBar) {
    function resetProgress() {
      progressBar.classList.remove('animating');
      void progressBar.offsetWidth; /* forza reflow */
      progressBar.classList.add('animating');
    }
    carousel.addEventListener('slide.bs.carousel', resetProgress);
    resetProgress();

    /* pausa su hover: ferma carousel e progress bar */
    carousel.addEventListener('mouseenter', function () {
      progressBar.style.animationPlayState = 'paused';
      bootstrap.Carousel.getInstance(carousel)?.pause();
    });
    carousel.addEventListener('mouseleave', function () {
      progressBar.style.animationPlayState = 'running';
      bootstrap.Carousel.getInstance(carousel)?.cycle();
    });
  }
})();

/* =============================================
   COOKIE MODAL — GDPR / Consent Mode v2
   Appare centrato al primo accesso (backdrop forzato).
   L'utente deve scegliere prima di usare il sito.
   Scadenza preferenze: 180 giorni
   ============================================= */
(function () {
  var STORAGE_KEY = 'cookiePrefs';
  var EXPIRY_MS   = 180 * 24 * 60 * 60 * 1000;

  if (localStorage.getItem('cookieConsent')) { localStorage.removeItem('cookieConsent'); }

  function getPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || typeof p.answered !== 'boolean' || !p.expires) return null;
      if (Date.now() > p.expires) { localStorage.removeItem(STORAGE_KEY); return null; }
      return p;
    } catch (e) { localStorage.removeItem(STORAGE_KEY); return null; }
  }

  function savePrefs(profiling) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answered: true, profiling: profiling, expires: Date.now() + EXPIRY_MS
    }));
  }

  function applyConsent(profiling) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage:  'granted',
        ad_storage:         profiling ? 'granted' : 'denied',
        ad_user_data:       profiling ? 'granted' : 'denied',
        ad_personalization: profiling ? 'granted' : 'denied'
      });
    }
  }

  var prefs = getPrefs();
  if (prefs) applyConsent(prefs.profiling);

  var modal = document.getElementById('cookieModal');
  if (!modal) return;

  var bsModalInstance = null;

  function closeConsentModal() {
    var inst = bsModalInstance || bootstrap.Modal.getInstance(modal);
    if (inst) inst.hide();
    bsModalInstance = null;
  }

  /* Primo accesso: apri il modal centrato, backdrop bloccante */
  if (!prefs) {
    setTimeout(function () {
      bsModalInstance = new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false });
      bsModalInstance.show();
    }, 300);
  }

  /* Bottone Accetta tutto */
  var acceptBtn = document.getElementById('cookieModalAccept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', function () {
      savePrefs(true); applyConsent(true); closeConsentModal();
    });
  }

  /* Bottone Rifiuta tutto */
  var rejectBtn = document.getElementById('cookieModalReject');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function () {
      savePrefs(false); applyConsent(false); closeConsentModal();
    });
  }

  /* Bottone Salva preferenze (toggle profilazione) */
  var savePrefsBtn = document.getElementById('cookieSavePrefs');
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', function () {
      var toggle = document.getElementById('toggleProfiling');
      var profiling = toggle ? toggle.checked : false;
      savePrefs(profiling); applyConsent(profiling); closeConsentModal();
    });
  }
})();

/* =============================================
   SCROLL SPY — evidenzia il link attivo
   ============================================= */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

window.addEventListener('scroll', function () {
  const scrollY = window.scrollY + 100;

  sections.forEach(function (section) {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const id     = section.getAttribute('id');

    if (scrollY >= top && scrollY < top + height) {
      navLinks.forEach(function (link) {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active');
        }
      });
    }
  });
}, { passive: true });
