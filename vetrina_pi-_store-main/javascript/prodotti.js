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
            // Utilizzo del fetch sul percorso passato nel costruttore
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

document.addEventListener('DOMContentLoaded', () => {
    // Qui è inserito il percorso corretto: ./data/ebook.json
    const store = new Store('store-container', './data/ebook.json');
    store.fetchEbooks();
});