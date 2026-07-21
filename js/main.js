/* ==============================================================
   MAIN.JS — Script condiviso da tutte le pagine
   Cursore custom, navbar, animazioni GSAP, scroll orizzontale
   (solo desktop: su mobile/tablet la sezione metodo è un
   carosello nativo che l'utente scorre con il dito).
   ============================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Fallback: se GSAP non carica, il contenuto deve comunque vedersi */
  function showAllHidden() {
    document.querySelectorAll(".gsap-fade, .gsap-hero-item > *").forEach(function (el) {
      el.style.opacity = "1";
      el.style.visibility = "visible";
    });
    document.querySelectorAll(".stat-number").forEach(function (stat) {
      stat.innerText = (stat.getAttribute("data-count") || "0") + (stat.getAttribute("data-suffix") || "");
    });
  }

  /* ------------------------------------------------------------
     Interazioni base (non richiedono GSAP)
     ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    // Ombra navbar allo scroll
    var nav = document.getElementById("mainNav");
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("scrolled", window.scrollY > 10);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Chiude il menu mobile quando si clicca un link
    var collapseEl = document.querySelector(".navbar-collapse");
    if (collapseEl && window.bootstrap) {
      collapseEl.querySelectorAll(".nav-link, .btn").forEach(function (link) {
        link.addEventListener("click", function () {
          if (collapseEl.classList.contains("show")) {
            bootstrap.Collapse.getOrCreateInstance(collapseEl).hide();
          }
        });
      });
    }

    // Carousel hero: sincronizza dots custom + barra di avanzamento
    var carousel = document.getElementById("ebookCarousel");
    if (carousel && window.bootstrap) {
      var dots = carousel.querySelectorAll(".c-dot");
      var progress = document.getElementById("carouselProgress");
      var interval = parseInt(carousel.getAttribute("data-bs-interval"), 10) || 3500;

      var animateProgress = function () {
        if (!progress || reduceMotion) return;
        progress.style.transition = "none";
        progress.style.width = "0%";
        void progress.offsetWidth; // reflow
        progress.style.transition = "width " + interval + "ms linear";
        progress.style.width = "100%";
      };

      carousel.addEventListener("slid.bs.carousel", function (e) {
        dots.forEach(function (d, i) { d.classList.toggle("active", i === e.to); });
        animateProgress();
      });
      animateProgress();
    }

    // Bottone "torna su" (iniettato via JS: presente su tutte le pagine)
    var topBtn = document.createElement("button");
    topBtn.className = "scroll-top-btn";
    topBtn.setAttribute("aria-label", "Torna in cima alla pagina");
    topBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    document.body.appendChild(topBtn);

    var toggleTopBtn = function () {
      topBtn.classList.toggle("visible", window.scrollY > 600);
    };
    toggleTopBtn();
    window.addEventListener("scroll", toggleTopBtn, { passive: true });
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    /* Calendly a scomparsa: chiuso di default (zero spazio bianco e
       zero script di terze parti al caricamento). Al click si apre,
       carica il widget e l'altezza segue il contenuto reale tramite
       gli eventi postMessage di Calendly. */
    var calWrap = document.getElementById("calendlyWrap");
    var calWidget = calWrap ? calWrap.querySelector(".calendly-inline-widget") : null;

    if (calWrap && calWidget) {
      // Sempre visibile: il widget si carica appena ci si avvicina
      // alla sezione contatti (o subito, senza IntersectionObserver)
      var loadCalendly = function () {
        if (window.__calendlyLoading) return;
        window.__calendlyLoading = true;
        var s = document.createElement("script");
        s.src = "https://assets.calendly.com/assets/external/widget.js";
        s.async = true;
        document.body.appendChild(s);
      };

      // Elimina fisicamente lo spinner che Calendly inietta nel DOM
      var killSpinner = new MutationObserver(function () {
        document.querySelectorAll(".calendly-spinner").forEach(function (sp) {
          sp.remove();
        });
      });
      killSpinner.observe(document.body, { childList: true, subtree: true });

      if ("IntersectionObserver" in window) {
        var calObs = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            calObs.disconnect();
            loadCalendly();
          }
        }, { rootMargin: "1200px 0px" });
        calObs.observe(calWrap);
      } else {
        loadCalendly();
      }

      // Altezza dinamica: Calendly comunica gli step via postMessage.
      // Il PRIMO messaggio = app dentro l'iframe davvero renderizzata:
      // solo allora il riquadro si apre (tutto o niente).
      window.addEventListener("message", function (e) {
        if (e.origin.indexOf("calendly.com") === -1) return;
        var d = e.data;
        if (!d || typeof d.event !== "string" || d.event.indexOf("calendly.") !== 0) return;

        calWidget.classList.add("is-ready");

        if (d.event === "calendly.page_height" && d.payload && d.payload.height) {
          // Altezza esatta comunicata dal widget
          calWidget.style.height = parseInt(d.payload.height, 10) + "px";
        } else if (d.event === "calendly.date_and_time_selected") {
          // Step con il form: serve più spazio
          calWidget.style.height = "1150px";
        } else if (d.event === "calendly.event_type_viewed") {
          // Step calendario
          calWidget.style.height = "700px";
        } else if (d.event === "calendly.event_scheduled") {
          // Conferma: compatta
          calWidget.style.height = "620px";
        }
      });
    }
  });

  /* ------------------------------------------------------------
     Animazioni GSAP
     ------------------------------------------------------------ */
  window.addEventListener("load", function () {
    if (typeof gsap === "undefined") {
      showAllHidden();
      return;
    }

    if (typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Transform 3D di default = animazioni su GPU, niente scatti
    gsap.defaults({ force3D: true });

    /* 1. CURSORE CUSTOM (solo dispositivi con mouse) */
    if (window.matchMedia("(pointer: fine)").matches) {
      var cursor = document.createElement("div");
      cursor.classList.add("custom-cursor");
      document.body.appendChild(cursor);
      // Il CSS nasconde il cursore nativo solo DOPO questa classe:
      // se il JS fallisce, il cursore normale resta sempre visibile
      document.body.classList.add("has-custom-cursor");

      // quickTo: un solo tween riciclato invece di crearne uno a ogni
      // mousemove → cursore fluido anche durante lo scroll
      var cursorX = gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3.out" });
      var cursorY = gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3.out" });
      window.addEventListener("mousemove", function (e) {
        cursorX(e.clientX);
        cursorY(e.clientY);
        cursor.classList.remove("cursor-hidden");
      });

      // Sopra un iframe (es. Calendly) il mouse non è tracciabile:
      // il pallino si nasconde e torna il cursore normale
      document.addEventListener("mouseover", function (e) {
        if (e.target.closest("iframe, .calendly-inline-widget")) {
          cursor.classList.add("cursor-hidden");
        }
      });
      // Mouse fuori dalla finestra → pallino nascosto
      document.documentElement.addEventListener("mouseleave", function () {
        cursor.classList.add("cursor-hidden");
      });
      document.documentElement.addEventListener("mouseenter", function () {
        cursor.classList.remove("cursor-hidden");
      });

      document.addEventListener("mouseover", function (e) {
        if (e.target.closest("a, button, .btn, .nav-link")) cursor.classList.add("hovered");
      });
      document.addEventListener("mouseout", function (e) {
        if (e.target.closest("a, button, .btn, .nav-link")) cursor.classList.remove("hovered");
      });

      // Magnetismo sui pulsanti principali
      document.querySelectorAll(".btn-gold, .btn-navy").forEach(function (btn) {
        btn.addEventListener("mousemove", function (e) {
          var rect = btn.getBoundingClientRect();
          var x = (e.clientX - rect.left - rect.width / 2) * 0.4;
          var y = (e.clientY - rect.top - rect.height / 2) * 0.4;
          gsap.to(btn, { x: x, y: y, duration: 0.3, ease: "power2.out" });
        });
        btn.addEventListener("mouseleave", function () {
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
        });
      });
    }

    /* Con "riduci animazioni" attivo nel sistema: cursore sì,
       ma contenuti subito visibili e niente effetti di ingresso */
    if (reduceMotion) {
      showAllHidden();
      return;
    }

    /* 2. ANIMAZIONE HERO */
    if (document.querySelector(".hero-overlay")) {
      gsap.set(".gsap-hero-item > *", { autoAlpha: 1 });

      gsap.timeline()
        .from(".hero-overlay", { autoAlpha: 0, duration: 0.9, ease: "power2.out" })
        .from(".hero-eyebrow, .hero-title, .hero-subtitle, .hero-actions", {
          y: 26,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          clearProps: "transform"
        }, "-=0.55");
    }

    /* 3. SCROLL ORIZZONTALE "IL MIO METODO" — SOLO DESKTOP.
       Sotto i 992px non viene creato nessun pin: il wrapper è un
       carosello nativo (overflow-x + scroll-snap) e a scorrere è
       l'utente. gsap.matchMedia gestisce da solo il resize. */
    var wrapper = document.querySelector(".horizontal-wrapper");
    if (wrapper && typeof ScrollTrigger !== "undefined") {
      var mm = gsap.matchMedia();

      mm.add("(min-width: 992px)", function () {
        var getScrollAmount = function () {
          return Math.max(0, wrapper.scrollWidth - window.innerWidth);
        };

        var tween = gsap.to(wrapper, {
          x: function () { return -getScrollAmount(); },
          ease: "none",
          scrollTrigger: {
            trigger: ".metodo-section",
            pin: true,
            scrub: 1,
            end: function () { return "+=" + getScrollAmount(); },
            invalidateOnRefresh: true
          }
        });

        // Cleanup automatico quando si scende sotto i 992px
        return function () {
          if (tween.scrollTrigger) tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(wrapper, { clearProps: "x" });
        };
      });
    }

    /* 4. FADE-UP ALLO SCROLL */
    var fadeElements = document.querySelectorAll(".gsap-fade");
    if (fadeElements.length > 0 && typeof ScrollTrigger !== "undefined") {
      gsap.set(".gsap-fade", { autoAlpha: 1 });

      ScrollTrigger.batch(".gsap-fade", {
        interval: 0.1,
        batchMax: 3,
        once: true,
        onEnter: function (batch) {
          gsap.from(batch, {
            autoAlpha: 0,
            y: 28,
            duration: 0.65,
            stagger: 0.12,
            ease: "power3.out",
            overwrite: true,
            // A fine animazione libera il layer GPU (will-change)
            onComplete: function () {
              batch.forEach(function (el) { el.style.willChange = "auto"; });
            }
          });
        },
        start: "top 88%"
      });
    }

    /* 5. CONTATORI ANIMATI */
    var stats = document.querySelectorAll(".stat-number");
    if (stats.length > 0 && typeof ScrollTrigger !== "undefined") {
      stats.forEach(function (stat) {
        var target = parseFloat(stat.getAttribute("data-count"));
        var suffix = stat.getAttribute("data-suffix") || "";

        gsap.set(stat.closest(".gsap-stat"), { autoAlpha: 1 });

        ScrollTrigger.create({
          trigger: stat.closest(".gsap-stat"),
          start: "top 80%",
          once: true,
          onEnter: function () {
            var obj = { val: 0 };
            gsap.from(stat.closest(".gsap-stat"), { y: 28, autoAlpha: 0, duration: 0.65, ease: "power3.out" });
            gsap.to(obj, {
              val: target,
              duration: 2,
              ease: "power3.out",
              onUpdate: function () { stat.innerText = Math.floor(obj.val) + suffix; }
            });
          }
        });
      });
    }
  });
})();
