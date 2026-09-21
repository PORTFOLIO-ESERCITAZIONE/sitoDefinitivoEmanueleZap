/* ==============================================================
   MAIN.JS — Script condiviso da tutte le pagine

   Ogni blocco è una funzione init* indipendente: se un elemento
   non c'è nella pagina, la funzione esce e le altre continuano.

     initNavbar()        navbar allo scroll + barra di lettura
     initScrollSpy()     evidenzia la voce di menu della sezione
     initScrollTop()     bottone "torna su"
     initCalendly()      caricamento pigro del widget
     initVideoHero()     avvia il video dell hero, con ripieghi
     initMetodo()        indice che segue la fase letta
     initTitoli()        spezza i titoli in parole animabili
     initSafetyNet()     mostra il contenuto se l animazione non parte
     initGsap()          animazioni di ingresso e scroll orizzontale
   ============================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer  = window.matchMedia("(pointer: fine)").matches;

  /* Fallback: se GSAP non carica, il contenuto deve comunque vedersi */
  function showAllHidden() {
    document.documentElement.classList.remove("js-anim");
    document.querySelectorAll(".gsap-fade, .gsap-stat, .gsap-hero-item > *").forEach(function (el) {
      el.style.opacity = "1";
      el.style.visibility = "visible";
      el.style.transform = "none";
    });
    document.querySelectorAll(".parola-int").forEach(function (el) {
      el.style.transform = "none";
      el.style.opacity = "1";
    });
    document.querySelectorAll(".stat-number").forEach(function (stat) {
      stat.innerText = (stat.getAttribute("data-count") || "0") + (stat.getAttribute("data-suffix") || "");
    });
  }

  /* ------------------------------------------------------------
     RETE DI SICUREZZA
     Se dopo 2,5s l hero è ancora invisibile, qualcosa ha impedito
     all animazione di partire (CDN lenta o bloccata, requestAnimation
     Frame congelato in una scheda in background...). In quel caso si
     mostra tutto: meglio senza effetti che una pagina vuota.
     ------------------------------------------------------------ */
  function initSafetyNet() {
    var probe = document.querySelector(".hero-title");
    if (!probe) return;

    setTimeout(function () {
      if (parseFloat(getComputedStyle(probe).opacity) < 0.05) showAllHidden();
    }, 2500);
  }

  /* ------------------------------------------------------------
     VIDEO DELL HERO — due affiancati, pro e contro
     autoplay+muted di solito basta, ma qualche browser lo rifiuta
     comunque: si riprova al primo gesto dell utente. Se proprio non
     parte resta il poster, che e gia un fotogramma del video.
     ------------------------------------------------------------ */
  function initVideoHero() {
    var video = Array.prototype.slice.call(document.querySelectorAll(".hero-video-layer"))
      .filter(function (v) { return typeof v.play === "function"; });
    if (!video.length) return;

    var avvia = function (v) {
      var p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    };
    var avviaTutti = function () { video.forEach(avvia); };

    avviaTutti();

    // In pagina parte la 720p: leggera, buona su qualunque telefono.
    // Su schermo largo, se la rete non e a contatore ne lenta, si passa
    // alla 1080p a video gia avviato, cosi il primo fotogramma non aspetta.
    var rete = navigator.connection || {};
    var lenta = /2g/.test(rete.effectiveType || "") || rete.saveData === true;
    if (!lenta && window.matchMedia("(min-width: 992px)").matches) {
      video.forEach(function (v) {
        var hd = v.getAttribute("data-hd");
        if (!hd) return;
        var pieno = document.createElement("video");
        pieno.preload = "auto";
        pieno.src = hd;
        pieno.addEventListener("canplaythrough", function () {
          var t = v.currentTime;
          v.src = hd;
          v.currentTime = t;
          avvia(v);
        }, { once: true });
      });
    }

    // I due video sono montati identici al fotogramma, ma due player
    // separati partono con qualche decimo di scarto e poi derivano.
    // Il primo (i pro) fa da capofila: se l altro si allontana piu di
    // 80 ms lo si riporta sul suo tempo. Copre anche il riavvolgimento
    // del loop e il cambio 720p -> 1080p, che riparte dal tempo giusto.
    if (video.length > 1) {
      var capofila = video[0];
      var allinea = function () {
        if (capofila.paused || !capofila.duration) return;
        video.slice(1).forEach(function (v) {
          if (!v.duration) return;
          if (Math.abs(v.currentTime - capofila.currentTime) > 0.08) {
            v.currentTime = capofila.currentTime;
          }
          if (v.paused) avvia(v);
        });
      };
      capofila.addEventListener("timeupdate", allinea);
      video.forEach(function (v) { v.addEventListener("loadeddata", allinea); });
    }

    var alGesto = function () {
      avviaTutti();
      document.removeEventListener("pointerdown", alGesto);
      document.removeEventListener("keydown", alGesto);
    };
    document.addEventListener("pointerdown", alGesto, { once: true });
    document.addEventListener("keydown", alGesto, { once: true });

    // Fuori schermo si mettono in pausa: non serve farli girare a vuoto
    if ("IntersectionObserver" in window) {
      var oss = new IntersectionObserver(function (voci) {
        voci.forEach(function (voce) {
          voce.isIntersecting ? avvia(voce.target) : voce.target.pause();
        });
      }, { threshold: 0.05 });
      video.forEach(function (v) { oss.observe(v); });
    }
  }

  /* ------------------------------------------------------------
     IL MIO METODO — l indice a sinistra segue la fase che si legge
     Niente rAF, niente GSAP: un IntersectionObserver e via.
     ------------------------------------------------------------ */
  function initMetodo() {
    if (!("IntersectionObserver" in window)) return;

    // Lo stesso schema serve a due sezioni (metodo e salute metabolica):
    // ognuna ha il suo indice e le sue schede, e va tenuta separata,
    // altrimenti la fase 1 dell una accende anche la fase 1 dell altra.
    document.querySelectorAll(".metodo-indice").forEach(function (indice) {
      var sezione = indice.closest("section");
      var voci = indice.querySelectorAll("li");
      var fasi = sezione ? sezione.querySelectorAll(".fase[data-fase]") : [];
      if (!voci.length || !fasi.length) return;

      var accendi = function (numero) {
        voci.forEach(function (v) {
          v.classList.toggle("attiva", v.getAttribute("data-fase") === numero);
        });
      };

      accendi("1");

      // La fascia centrale dello schermo decide quale fase e "quella corrente"
      var osservatore = new IntersectionObserver(function (viste) {
        viste.forEach(function (v) {
          if (v.isIntersecting) accendi(v.target.getAttribute("data-fase"));
        });
      }, { rootMargin: "-45% 0px -45% 0px" });

      fasi.forEach(function (f) { osservatore.observe(f); });
    });
  }

  /* ------------------------------------------------------------
     TITOLI A COMPARSA
     Ogni parola finisce dentro una finestrella con overflow nascosto,
     così può salire da sotto invece di limitarsi a sfumare. Qui si
     prepara solo il DOM: a muoverlo è initGsap.
     ------------------------------------------------------------ */
  function initTitoli() {
    if (reduceMotion) return;

    var spezza = function (nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (figlio) {
        if (figlio.nodeType === 3) {
          // Nodo di testo: ogni parola diventa finestrella + contenuto
          var pezzi = figlio.textContent.split(/(\s+)/);
          var frammento = document.createDocumentFragment();

          pezzi.forEach(function (pezzo) {
            if (!pezzo.trim()) {
              frammento.appendChild(document.createTextNode(pezzo));
              return;
            }
            var finestra = document.createElement("span");
            var interno = document.createElement("span");
            finestra.className = "parola";
            interno.className = "parola-int";
            interno.textContent = pezzo;
            finestra.appendChild(interno);
            frammento.appendChild(finestra);
          });

          nodo.replaceChild(frammento, figlio);
        } else if (figlio.nodeType === 1) {
          spezza(figlio); // dentro <em> e simili si continua
        }
      });
    };

    document.querySelectorAll(".reveal-parole").forEach(spezza);
  }

  /* ------------------------------------------------------------
     NAVBAR — fondo pieno allo scroll + barra di avanzamento
     ------------------------------------------------------------ */
  function initNavbar() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;

    var progress = document.getElementById("navProgress");
    var ticking  = false;

    var update = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);

      if (progress) {
        var scrollable = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
        progress.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
      }
      ticking = false;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Il menu offcanvas si chiude appena si sceglie una voce
    var panel = nav.querySelector(".nav-offcanvas");
    if (panel && window.bootstrap) {
      panel.querySelectorAll(".nav-link, .btn").forEach(function (link) {
        link.addEventListener("click", function () {
          if (panel.classList.contains("show")) {
            bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
          }
        });
      });
    }
  }

  /* ------------------------------------------------------------
     SCROLLSPY — la voce di menu segue la sezione visibile
     ------------------------------------------------------------ */
  function initScrollSpy() {
    var list = document.getElementById("navList");
    if (!list) return;

    // Solo i link interni (#sezione): sulle altre pagine non c'è nulla da fare
    var links = Array.prototype.filter.call(
      list.querySelectorAll(".nav-link"),
      function (a) { return (a.getAttribute("href") || "").charAt(0) === "#"; }
    );
    if (!links.length) return;

    var targets = links
      .map(function (a) {
        return { link: a, section: document.querySelector(a.getAttribute("href")) };
      })
      .filter(function (t) { return t.section; });

    var navHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--nav-height"), 10) || 72;

    var ticking = false;

    var update = function () {
      var line = navHeight + 24;
      var current = null;
      var last = null;

      targets.forEach(function (t) {
        var rect = t.section.getBoundingClientRect();

        // Sezione nascosta (es. ebook con d-none): rettangolo a zero,
        // va saltata o vincerebbe sempre il confronto
        if (!rect.width && !rect.height) return;

        last = t;
        // getBoundingClientRect e non offsetTop: la sezione "metodo"
        // viene messa in pin da ScrollTrigger dentro un pin-spacer
        if (rect.top <= line) current = t;
      });

      // In fondo alla pagina vince sempre l'ultima sezione visibile
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        current = last;
      }

      targets.forEach(function (t) {
        t.link.classList.toggle("active", t === current);
      });
      ticking = false;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------
     BOTTONE "TORNA SU" (iniettato: presente su tutte le pagine)
     ------------------------------------------------------------ */
  function initScrollTop() {
    var btn = document.createElement("button");
    btn.className = "scroll-top-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Torna in cima alla pagina");
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    document.body.appendChild(btn);

    var toggle = function () {
      btn.classList.toggle("visible", window.scrollY > 600);
    };
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------
     CALENDLY — lo script di terze parti si carica solo quando
     ci si avvicina alla sezione contatti; il riquadro si apre
     quando l'app dentro l'iframe è davvero renderizzata.
     ------------------------------------------------------------ */
  function initCalendly() {
    var wrap = document.getElementById("calendlyWrap");
    var widget = wrap ? wrap.querySelector(".calendly-inline-widget") : null;
    if (!wrap || !widget) return;

    var load = function () {
      if (window.__calendlyLoading) return;
      window.__calendlyLoading = true;
      var s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      document.body.appendChild(s);
    };

    // Elimina lo spinner che Calendly inietta fuori dall'iframe
    new MutationObserver(function () {
      document.querySelectorAll(".calendly-spinner").forEach(function (sp) { sp.remove(); });
    }).observe(document.body, { childList: true, subtree: true });

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          load();
        }
      }, { rootMargin: "1200px 0px" });
      obs.observe(wrap);
    } else {
      load();
    }

    // Altezza dinamica: Calendly comunica gli step via postMessage
    window.addEventListener("message", function (e) {
      if (e.origin.indexOf("calendly.com") === -1) return;
      var d = e.data;
      if (!d || typeof d.event !== "string" || d.event.indexOf("calendly.") !== 0) return;

      widget.classList.add("is-ready");

      if (d.event === "calendly.page_height" && d.payload && d.payload.height) {
        widget.style.height = parseInt(d.payload.height, 10) + "px";
      } else if (d.event === "calendly.date_and_time_selected") {
        widget.style.height = "1150px";   // step con il form
      } else if (d.event === "calendly.event_type_viewed") {
        widget.style.height = "700px";    // step calendario
      } else if (d.event === "calendly.event_scheduled") {
        widget.style.height = "620px";    // conferma
      }
    });
  }

  /* ------------------------------------------------------------
     TITOLI A COMPARSA
     Ogni parola finisce dentro una finestrella con overflow nascosto,
     così può salire da sotto invece di limitarsi a sfumare. Qui si
     prepara solo il DOM: a muoverlo è initGsap.
     ------------------------------------------------------------ */
  function initTitoli() {
    if (reduceMotion) return;

    var spezza = function (nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (figlio) {
        if (figlio.nodeType === 3) {
          // Nodo di testo: ogni parola diventa finestrella + contenuto
          var pezzi = figlio.textContent.split(/(\s+)/);
          var frammento = document.createDocumentFragment();

          pezzi.forEach(function (pezzo) {
            if (!pezzo.trim()) {
              frammento.appendChild(document.createTextNode(pezzo));
              return;
            }
            var finestra = document.createElement("span");
            var interno = document.createElement("span");
            finestra.className = "parola";
            interno.className = "parola-int";
            interno.textContent = pezzo;
            finestra.appendChild(interno);
            frammento.appendChild(finestra);
          });

          nodo.replaceChild(frammento, figlio);
        } else if (figlio.nodeType === 1) {
          spezza(figlio); // dentro <em> e simili si continua
        }
      });
    };

    document.querySelectorAll(".reveal-parole").forEach(spezza);
  }

  /* ------------------------------------------------------------
     NAVBAR — fondo pieno allo scroll + barra di avanzamento
     ------------------------------------------------------------ */
  function initNavbar() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;

    var progress = document.getElementById("navProgress");
    var ticking  = false;

    var update = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);

      if (progress) {
        var scrollable = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
        progress.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
      }
      ticking = false;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Il menu offcanvas si chiude appena si sceglie una voce
    var panel = nav.querySelector(".nav-offcanvas");
    if (panel && window.bootstrap) {
      panel.querySelectorAll(".nav-link, .btn").forEach(function (link) {
        link.addEventListener("click", function () {
          if (panel.classList.contains("show")) {
            bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
          }
        });
      });
    }
  }

  /* ------------------------------------------------------------
     SCROLLSPY — la voce di menu segue la sezione visibile
     ------------------------------------------------------------ */
  function initScrollSpy() {
    var list = document.getElementById("navList");
    if (!list) return;

    // Solo i link interni (#sezione): sulle altre pagine non c'è nulla da fare
    var links = Array.prototype.filter.call(
      list.querySelectorAll(".nav-link"),
      function (a) { return (a.getAttribute("href") || "").charAt(0) === "#"; }
    );
    if (!links.length) return;

    var targets = links
      .map(function (a) {
        return { link: a, section: document.querySelector(a.getAttribute("href")) };
      })
      .filter(function (t) { return t.section; });

    var navHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--nav-height"), 10) || 72;

    var ticking = false;

    var update = function () {
      var line = navHeight + 24;
      var current = null;
      var last = null;

      targets.forEach(function (t) {
        var rect = t.section.getBoundingClientRect();

        // Sezione nascosta (es. ebook con d-none): rettangolo a zero,
        // va saltata o vincerebbe sempre il confronto
        if (!rect.width && !rect.height) return;

        last = t;
        // getBoundingClientRect e non offsetTop: la sezione "metodo"
        // viene messa in pin da ScrollTrigger dentro un pin-spacer
        if (rect.top <= line) current = t;
      });

      // In fondo alla pagina vince sempre l'ultima sezione visibile
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        current = last;
      }

      targets.forEach(function (t) {
        t.link.classList.toggle("active", t === current);
      });
      ticking = false;
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------
     BOTTONE "TORNA SU" (iniettato: presente su tutte le pagine)
     ------------------------------------------------------------ */
  function initScrollTop() {
    var btn = document.createElement("button");
    btn.className = "scroll-top-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Torna in cima alla pagina");
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    document.body.appendChild(btn);

    var toggle = function () {
      btn.classList.toggle("visible", window.scrollY > 600);
    };
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------
     CALENDLY — lo script di terze parti si carica solo quando
     ci si avvicina alla sezione contatti; il riquadro si apre
     quando l'app dentro l'iframe è davvero renderizzata.
     ------------------------------------------------------------ */
  function initCalendly() {
    var wrap = document.getElementById("calendlyWrap");
    var widget = wrap ? wrap.querySelector(".calendly-inline-widget") : null;
    if (!wrap || !widget) return;

    var load = function () {
      if (window.__calendlyLoading) return;
      window.__calendlyLoading = true;
      var s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      document.body.appendChild(s);
    };

    // Elimina lo spinner che Calendly inietta fuori dall'iframe
    new MutationObserver(function () {
      document.querySelectorAll(".calendly-spinner").forEach(function (sp) { sp.remove(); });
    }).observe(document.body, { childList: true, subtree: true });

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          load();
        }
      }, { rootMargin: "1200px 0px" });
      obs.observe(wrap);
    } else {
      load();
    }

    // Altezza dinamica: Calendly comunica gli step via postMessage
    window.addEventListener("message", function (e) {
      if (e.origin.indexOf("calendly.com") === -1) return;
      var d = e.data;
      if (!d || typeof d.event !== "string" || d.event.indexOf("calendly.") !== 0) return;

      widget.classList.add("is-ready");

      if (d.event === "calendly.page_height" && d.payload && d.payload.height) {
        widget.style.height = parseInt(d.payload.height, 10) + "px";
      } else if (d.event === "calendly.date_and_time_selected") {
        widget.style.height = "1150px";   // step con il form
      } else if (d.event === "calendly.event_type_viewed") {
        widget.style.height = "700px";    // step calendario
      } else if (d.event === "calendly.event_scheduled") {
        widget.style.height = "620px";    // conferma
      }
    });
  }

  /* ------------------------------------------------------------
     GSAP — ingressi, parallasse, titoli, contatori
     ------------------------------------------------------------ */
  function initGsap() {
    if (typeof gsap === "undefined") {
      showAllHidden();
      return;
    }

    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    // Transform 3D di default = animazioni su GPU, niente scatti
    // (va su config, non su defaults: lì GSAP lo rifiuta con un warning)
    gsap.config({ force3D: true });

    /* Magnetismo sui pulsanti principali (solo mouse) */
    if (finePointer && !reduceMotion) {
      document.querySelectorAll(".btn-gold, .btn-navy").forEach(function (btn) {
        btn.addEventListener("mousemove", function (e) {
          var rect = btn.getBoundingClientRect();
          gsap.to(btn, {
            x: (e.clientX - rect.left - rect.width / 2) * 0.35,
            y: (e.clientY - rect.top - rect.height / 2) * 0.35,
            duration: 0.3,
            ease: "power2.out"
          });
        });
        btn.addEventListener("mouseleave", function () {
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
        });
      });
    }

    /* Con "riduci animazioni" attivo: contenuti subito visibili */
    if (reduceMotion) {
      showAllHidden();
      return;
    }

    /* 1. INGRESSO HERO — il video si allarga appena, poi sale il testo */
    if (document.querySelector(".hero-testo")) {
      gsap.set(".gsap-hero-item > *", { autoAlpha: 1 });

      gsap.timeline()
        .from(".hero-video-layer", {
          // si scala il video, non il contenitore: cosi l ingrandimento
          // resta ritagliato da .hero-video e non sborda dal viewport
          scale: 1.06,
          duration: 1.4,
          ease: "power2.out",
          clearProps: "transform"
        })
        .from(".hero-video", { autoAlpha: 0, duration: 0.8, ease: "power2.out" }, 0)
        .from(".hero-eyebrow, .hero-title, .hero-subtitle, .hero-actions", {
          y: 26,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.14,
          ease: "power3.out",
          clearProps: "transform"
        }, "-=0.75");
    }

    /* 2. PARALLASSE SULLE IMMAGINI
       Le foto sono renderizzate piu grandi del contenitore (scale nel
       CSS): qui si sposta solo l eccedenza, quindi non restano mai
       bordi vuoti. Movimento minimo, si nota senza distrarre. */
    if (typeof ScrollTrigger !== "undefined") {
      document.querySelectorAll(".about-photo-frame img").forEach(function (img) {
        gsap.fromTo(img,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true
            }
          }
        );
      });
    }

    /* Sul telefono la barra degli indirizzi che appare e sparisce e un
       resize: senza questo ScrollTrigger ricalcolava tutto a ogni
       scatto e gli elementi saltavano. */
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.config({ ignoreMobileResize: true });
    }

    /* Regola comune alle animazioni di ingresso: un elemento va SOLO
       da nascosto a visibile, mai il contrario. Prima si rendeva tutto
       visibile all avvio e poi un gsap.from() lo spegneva di colpo per
       farlo riapparire in dissolvenza: scorrendo veloce il blocco era
       gia in vista e quel buio di un fotogramma era il lampeggio. */

    /* 3. TITOLI: le parole salgono da sotto la loro finestrella
       Si nascondono solo i titoli che stanno ancora sotto lo schermo:
       quelli gia in vista restano fermi e leggibili. */
    if (typeof ScrollTrigger !== "undefined") {
      document.querySelectorAll(".reveal-parole").forEach(function (titolo) {
        var parole = titolo.querySelectorAll(".parola-int");
        if (!parole.length) return;
        if (titolo.getBoundingClientRect().top < window.innerHeight) return;

        var liberaParole = function () {
          parole.forEach(function (p) { p.style.transform = "none"; });
        };

        gsap.set(parole, { yPercent: 115 });
        ScrollTrigger.create({
          trigger: titolo,
          start: "top 92%",
          once: true,
          onEnter: function () {
            gsap.to(parole, {
              yPercent: 0,
              duration: 0.8,
              ease: "power4.out",
              stagger: 0.045,
              overwrite: true,
              onComplete: liberaParole
            });
            // se l animazione si pianta, dopo due secondi le parole
            // tornano al loro posto: mai un titolo mutilato
            setTimeout(liberaParole, 2000);
          }
        });
      });
    }

    /* 4. FADE-UP ALLO SCROLL (blocchi e contatori)
       Partono nascosti dal CSS (.js-anim .gsap-fade) e si accendono
       una volta sola. Scatta presto (92%) e dura poco: chi scorre
       veloce trova il contenuto gia acceso quando arriva a leggerlo. */
    if (typeof ScrollTrigger !== "undefined") {
      var blocchi = document.querySelectorAll(".gsap-fade, .gsap-stat");
      var accendi = function (el) {
        if (el.dataset.acceso) return;
        el.dataset.acceso = "1";
        gsap.fromTo(el,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", overwrite: true,
            onComplete: function () { el.style.willChange = "auto"; }
          });
        if (el.classList.contains("gsap-stat")) contaStat(el);
      };
      // chi e gia passato sopra lo schermo (arrivo da un ancora, ricarica
      // a meta pagina, scorrimento a scatti) si accende subito, senza tween
      var accendiSopra = function () {
        blocchi.forEach(function (el) {
          if (el.dataset.acceso) return;
          if (el.getBoundingClientRect().bottom < 0) {
            el.dataset.acceso = "1";
            gsap.set(el, { autoAlpha: 1, y: 0 });
            if (el.classList.contains("gsap-stat")) contaStat(el, true);
          }
        });
      };

      ScrollTrigger.batch(blocchi, {
        interval: 0.05,
        batchMax: 4,
        once: true,
        start: "top 92%",
        onEnter: function (batch) {
          batch.forEach(function (el, k) {
            gsap.delayedCall(k * 0.08, accendi, [el]);
          });
        }
      });
      ScrollTrigger.addEventListener("refresh", accendiSopra);
      ScrollTrigger.addEventListener("scrollEnd", accendiSopra);
      accendiSopra();
    }

    /* 5. CONTATORI ANIMATI (chiamati da accendi/accendiSopra) */
    function contaStat(block, subito) {
      var stat = block.querySelector(".stat-number");
      if (!stat) return;
      var target = parseFloat(stat.getAttribute("data-count"));
      var suffix = stat.getAttribute("data-suffix") || "";
      if (subito) { stat.innerText = Math.floor(target) + suffix; return; }
      var obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: "power3.out",
        onUpdate: function () { stat.innerText = Math.floor(obj.val) + suffix; }
      });
    }
  }

  /* ------------------------------------------------------------
     AVVIO
     Il DOM basta per tutto tranne GSAP, che aspetta il load
     (gli script delle CDN possono arrivare in ritardo).
     ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initNavbar();
    initScrollSpy();
    initScrollTop();
    initCalendly();
    initVideoHero();
    initMetodo();
    initTitoli();
    initSafetyNet();
  });

  window.addEventListener("load", initGsap);
})();
