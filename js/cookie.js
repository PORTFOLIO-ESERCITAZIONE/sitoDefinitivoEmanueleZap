/* ==============================================================
   COOKIE.JS — Logica consenso cookie (banner + modale)
   Prima il banner era solo HTML/CSS senza logica: non appariva
   mai e i pulsanti non facevano nulla. Ora il consenso viene
   salvato in localStorage e il banner appare solo se manca.
   ============================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "ez_cookie_consent";

  function getConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function saveConsent(profiling) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        profiling: !!profiling,
        date: new Date().toISOString()
      }));
    } catch (e) { /* storage non disponibile */ }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var banner = document.getElementById("cookieBanner");
    var modalEl = document.getElementById("cookieModal");
    var toggleProfiling = document.getElementById("toggleProfiling");

    function hideBanner() {
      if (!banner) return;
      banner.classList.remove("visible");
      setTimeout(function () { banner.style.display = "none"; }, 450);
    }

    function showBanner() {
      if (!banner) return;
      banner.style.display = "block";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { banner.classList.add("visible"); });
      });
    }

    function closeModal() {
      if (modalEl && window.bootstrap) {
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }
    }

    function decide(profiling) {
      saveConsent(profiling);
      if (toggleProfiling) toggleProfiling.checked = !!profiling;
      hideBanner();
      closeModal();
    }

    // Mostra il banner solo se l'utente non ha ancora scelto
    var consent = getConsent();
    if (!consent) {
      showBanner();
    } else if (toggleProfiling) {
      toggleProfiling.checked = !!consent.profiling;
    }

    // Pulsanti banner
    var accept = document.getElementById("cookieAccept");
    var reject = document.getElementById("cookieReject");
    var customize = document.getElementById("cookieCustomize");
    if (accept) accept.addEventListener("click", function () { decide(true); });
    if (reject) reject.addEventListener("click", function () { decide(false); });
    if (customize) customize.addEventListener("click", function () {
      if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
    });

    // Pulsanti modale
    var mAccept = document.getElementById("cookieModalAccept");
    var mReject = document.getElementById("cookieModalReject");
    var mSave = document.getElementById("cookieSavePrefs");
    if (mAccept) mAccept.addEventListener("click", function () { decide(true); });
    if (mReject) mReject.addEventListener("click", function () { decide(false); });
    if (mSave) mSave.addEventListener("click", function () {
      decide(toggleProfiling ? toggleProfiling.checked : false);
    });

    // Link/pulsante "Gestisci preferenze" nelle pagine
    var openBtn = document.getElementById("openCookiePrefs");
    if (openBtn) openBtn.addEventListener("click", function () {
      if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
    });
  });
})();
