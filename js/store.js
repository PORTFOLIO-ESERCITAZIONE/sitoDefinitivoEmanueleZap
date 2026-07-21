/* ==============================================================
   STORE.JS — Rendering ebook da JSON + animazioni store
   (il cursore custom e le altre interazioni sono in main.js)
   ============================================================== */

class Ebook {
  constructor(data) {
    this.id = data.id;
    this.copertina = data.copertina;
    this.titolo = data.titolo;
    this.descrizione = data.descrizione;
    this.prezzo = data.prezzo;
    this.link = data.link;
  }

  render() {
    return `
      <div class="col-10 col-sm-6 col-md-4 col-lg-3">
        <div class="store-card">
          <div class="store-card-cover">
            <img src="${this.copertina}" alt="Ebook - ${this.titolo}" loading="lazy">
          </div>
          <div class="store-card-body">
            <h3 class="store-card-title">${this.titolo}</h3>
            <p class="store-card-desc">${this.descrizione}</p>
          </div>
          <div class="store-card-footer">
            <span class="store-card-price">€ ${this.prezzo}</span>
            <a href="${this.link}" class="btn btn-gold" target="_blank" rel="noopener">
              Acquista <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

class Store {
  constructor(containerId, jsonPath) {
    this.container = document.getElementById(containerId);
    this.jsonPath = jsonPath;
    this.ebooks = [];
  }

  async fetchEbooks() {
    if (!this.container) return;
    try {
      const response = await fetch(this.jsonPath);
      if (!response.ok) throw new Error("Errore caricamento JSON");
      const data = await response.json();

      this.ebooks = data.map((ebookData) => new Ebook(ebookData));
      this.renderStore();
      this.initAnimations();
    } catch (error) {
      console.error("Errore:", error);
      this.container.innerHTML = `<p class="text-danger text-center">Contenuto non disponibile.</p>`;
    }
  }

  renderStore() {
    this.container.innerHTML = this.ebooks.map((ebook) => ebook.render()).join("");
  }

  initAnimations() {
    const cards = this.container.querySelectorAll(".store-card");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach((card, i) => {
      card.style.transitionDelay = i * 0.14 + "s";
      observer.observe(card);
      setTimeout(() => { card.style.transitionDelay = "0s"; }, 900 + i * 140);
    });
  }
}

function initStore() {
  new Store("store-container", "./data/ebook.json").fetchEbooks();

  // Info bar: appare quando entra in viewport
  const infoBar = document.getElementById("storeInfoBar");
  if (infoBar) {
    const barObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        infoBar.classList.add("is-visible");
        barObs.disconnect();
      }
    }, { threshold: 0.1 });
    barObs.observe(infoBar);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStore);
} else {
  initStore();
}
