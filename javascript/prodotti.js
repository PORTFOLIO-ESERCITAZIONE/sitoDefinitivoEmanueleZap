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
                <div class="store-card store-fade-in">
                    <div class="store-card-cover">
                        <img src="${this.copertina}" alt="Ebook - ${this.titolo}">
                    </div>
                    <div class="store-card-body">
                        <h3 class="store-card-title">${this.titolo}</h3>
                        <p class="store-card-desc">${this.descrizione}</p>
                    </div>
                    <div class="store-card-footer">
                        <span class="store-card-price">€ ${this.prezzo}</span>
                        <a href="${this.link}" class="btn btn-gold">
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
        try {
            const response = await fetch(this.jsonPath);
            if (!response.ok) throw new Error('Errore caricamento JSON');
            const data = await response.json();
            
            this.ebooks = data.map(ebookData => new Ebook(ebookData));
            this.renderStore();
            this.initAnimations();
        } catch (error) {
            console.error('Errore:', error);
            if (this.container) {
                this.container.innerHTML = `<p class="text-danger text-center">Contenuto non disponibile.</p>`;
            }
        }
    }

    renderStore() {
        if (!this.container) return;
        this.container.innerHTML = this.ebooks.map(ebook => ebook.render()).join('');
    }

    initAnimations() {
        const cards = this.container.querySelectorAll('.store-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        cards.forEach((card, i) => {
            card.style.transitionDelay = (i * 0.14) + 's';
            observer.observe(card);

            setTimeout(() => {
                card.style.transitionDelay = '0s';
            }, 900 + i * 140);
        });
    }
}

// INIZIALIZZAZIONE SICURA (Risolve il bug di type="module")
function initApp() {
    // 1. Inizializza lo store
    const store = new Store('store-container', './data/ebook.json');
    store.fetchEbooks();

    // 2. Crea cursore GSAP (Solo se GSAP è stato caricato)
    if (typeof gsap !== "undefined") {
        const cursor = document.createElement('div');
        cursor.classList.add('custom-cursor');
        document.body.appendChild(cursor);

        // Movimento cursore
        window.addEventListener('mousemove', (e) => {
            gsap.to(cursor, { 
                x: e.clientX, 
                y: e.clientY, 
                duration: 0.1, 
                ease: "power2.out" 
            });
        });

        // Delegazione eventi: funziona anche sui bottoni creati dopo dal JSON
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('a, button, .btn, .nav-link')) {
                cursor.classList.add('hovered');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('a, button, .btn, .nav-link')) {
                cursor.classList.remove('hovered');
            }
        });
    }
}

// Assicura che il DOM sia pronto anche all'interno di un modulo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}