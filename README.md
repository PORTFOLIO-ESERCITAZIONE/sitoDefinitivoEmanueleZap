# Sito Emanuele Zappalà — Biologo Nutrizionista

Sito statico: solo HTML, CSS e JavaScript. Nessun backend, nessun passaggio
di build, nessuna dipendenza da installare.

## Come si guarda in locale

Aprire `index.html` con un doppio clic funziona quasi del tutto, ma lo store
carica `data/ebook.json` via `fetch`, che i browser bloccano sui file locali.
Per vedere anche quello serve un server, e ne basta uno qualsiasi:

```bash
python -m http.server 8001
```

Poi <http://localhost:8001>.

## Come si mette online

Si caricano i file così come sono. Va bene qualsiasi hosting statico —
Netlify, Cloudflare Pages, GitHub Pages, o un normale spazio FTP.

Prima di pubblicare, sostituire `TUO-DOMINIO.it` con il dominio reale in:

- `index.html` — tag `canonical` e Open Graph
- `sitemap.xml` e `robots.txt`

## Come è organizzato

| Cartella | Contenuto |
| --- | --- |
| `*.html` | Le cinque pagine |
| `css/` | `base.css` comune a tutte, poi uno per tipo di pagina |
| `js/` | `main.js` comune, `store.js` per lo store, `cookie.js` per il consenso |
| `img/` | Foto, copertine e il video dell'hero |
| `data/` | `ebook.json`, l'elenco degli ebook dello store |

Le pagine:

| File | Pagina |
| --- | --- |
| `index.html` | Home |
| `ebook.html` | Store |
| `privacy.html` | Privacy Policy |
| `cgv.html` | Condizioni di vendita |
| `cookie-policy.html` | Cookie Policy |

## Cache: la versione negli URL

I collegamenti a CSS e JS finiscono con `?v=20260921e`. Serve a un problema
concreto: se modifichi `home.css` senza cambiare il nome del file, i browser
che hanno già visitato il sito continuano a usare la copia vecchia e non
vedono le modifiche.

**Dopo ogni modifica a un file in `css/` o `js/`, cambia quel numero in tutti
e cinque gli HTML** (un cerca-e-sostituisci basta). Lo stesso vale per il video
dell'hero e il suo poster, che portano la stessa versione in `index.html`.
Per le altre immagini sostituite conviene invece rinominare il file.

## Cose da sapere

**Navbar e footer sono copiati in ogni pagina.** È il prezzo di non avere un
passaggio di build: se cambi una voce di menu la devi cambiare in tutti e
cinque i file. Sono blocchi identici, quindi un cerca-e-sostituisci basta.

**Sezione ebook sospesa.** In `index.html` la sezione, la voce di menu, il
bottone nell'hero e l'icona dello store nei contatti hanno la classe `d-none`
e un commento `<!-- D-NONE -->`. Per riattivarla si tolgono quelle quattro
classi. La pagina `ebook.html` esiste già ed è completa.

**I video dell'hero** sono due, affiancati: a sinistra i "pro" (cibo vero,
dieta mediterranea), a destra i "contro" (cibo spazzatura, caramelle,
consumismo alimentare). Ognuno esiste in due versioni con lo stesso
montaggio: `img/hero-pro.mp4` (3,3 MB, 1920×1080) e `img/hero-pro-720.mp4`
(1,4 MB), `img/hero-contro.mp4` (2,1 MB) e `img/hero-contro-720.mp4` (905 KB).
La pagina carica sempre le 720p; su schermi da 992 px in su, e solo se la
connessione non è lenta o a consumo, `js/main.js` le sostituisce con le 1080p
a video già avviato (attributo `data-hd` sul tag `<video>`). Così il telefono
scarica meno della metà e il desktop non perde qualità.

Sono catene di clip di repertorio prese da Coverr, la cui licenza consente
l'uso commerciale senza attribuzione. Pro: pomodori, uva bianca al sole,
macedonia, acqua versata. Contro: hamburger e patatine,
coca-cola, negozio di caramelle, donuts colorati su un piattino. Nei "pro"
niente pentole, ciotole di plastica o metallo: sarebbero in contraddizione
con la tesi del cliente sui materiali che contaminano il cibo.

I due montaggi sono in simbiosi: 4 clip da 6,5 s l'una, dissolvenze da 0,8 s,
546 fotogrammi esatti (22,7 s) entrambi, quindi le transizioni cadono nello
stesso istante e il loop riparte insieme. In pagina `js/main.js` tiene il
video di destra agganciato a quello di sinistra: se si allontana più di
80 ms lo riporta sul suo tempo. Per cambiare la durata delle clip basta
`PER_CLIP` in `catena_hero.py`, che controlla anche che ogni taglio stia
dentro la sua sorgente. Le clip passano una
nell'altra in dissolvenza da 0,8 s e la coda rientra in dissolvenza
sull'inizio, quindi il riavvolgimento non si vede. Tutte sono corrette di
colore verso il navy del sito; il lato "contro" è in più desaturato e velato
di blu, così si sente che è il lato sbagliato.

Per sostituirli con video girati con Emanuele bastano i sei file `hero-pro*` e
`hero-contro*` più i due poster: il markup non va toccato.

**Sezione 02, salute metabolica.** Sta subito sotto "Chi sono", perché è la
presentazione dello studio in prima persona. Solo testo, su richiesta del
cliente: niente foto. Il file `img/palestra-4.jpg` non è più usato in pagina.

**Copertine dei reel.** Il mockup del telefono usa `img/reel-1.jpg` …
`reel-16.jpg` più `img/ig-avatar-emanuele.jpg` per l'avatar: sono le immagini vere del
profilo. Quattordici su sedici sono 9:16, due sono quadrate; i riquadri sono
3:4 come le anteprime del profilo e a inquadrarle ci pensa `object-fit`.
Per aggiornarne una basta sostituire il file con lo stesso nome.

**Peso delle immagini.** `img/` pesa ~13 MB, quasi tutto per due PNG da 6,3 e
4,2 MB (`instagram1.png.png` e `instagram4.png.png`). Convertirli in WebP è di
gran lunga l'intervento con più effetto sulla velocità del sito.

## Librerie esterne

Caricate da CDN, niente da installare: Bootstrap 5.3.3, Bootstrap Icons,
Google Fonts (Playfair Display + Inter), GSAP con ScrollTrigger per le
animazioni. Se GSAP non risponde il contenuto resta comunque visibile: c'è un
controllo di sicurezza in `main.js` che lo rimette a posto dopo 2,5 secondi.
