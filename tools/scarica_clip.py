# -*- coding: utf-8 -*-
"""Scarica da Coverr le clip sorgente elencate in catena_hero.py.

Cerca ogni clip nella pagina di ricerca di Coverr e salva la 1080p in
tools/clip/. Le clip già presenti non vengono riscaricate.

Uso:
    py -3 tools/scarica_clip.py            # tutte
    py -3 tools/scarica_clip.py contro     # solo quelle di un video
"""
import io
import os
import re
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catena_hero  # noqa: E402

INT = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")}

# per ogni clip, una ricerca di Coverr in cui compare
RICERCHE = {
    "picking-tomatoes":             "vegetables",
    "sun-shining-on-white-grapes":  "grapes vineyard",
    "mixing-a-fruit-salad":         "healthy food",
    "pouring-water-in-a-glass":     "water pour",
    "onion-on-a-hamburger":         "hamburger",
    "pouring-a-glass-of-coca-cola": "soda",
    "candy-shop":                   "candy",
    "mini-donuts-on-a-plate":       "donut",
}


def cerca(q):
    u = "https://coverr.co/s?q=" + urllib.parse.quote(q)
    pagina = urllib.request.urlopen(urllib.request.Request(u, headers=INT), timeout=30)
    d = pagina.read().decode("utf-8", "replace")
    return dict((m.group(1), m.group(0)) for m in
                re.finditer(r'https://cdn\.coverr\.co/videos/coverr-([a-z0-9-]+?)-(\d+)/1080p\.mp4', d))


def main():
    os.makedirs(catena_hero.CLIP, exist_ok=True)
    voluti = sys.argv[1:] or list(catena_hero.VIDEO)
    nomi = [c for v in voluti for c, _, _ in catena_hero.VIDEO[v]]
    for nome in nomi:
        dest = os.path.join(catena_hero.CLIP, nome + ".mp4")
        if os.path.exists(dest):
            print("%-30s già presente" % nome)
            continue
        trovati = cerca(RICERCHE.get(nome, nome.replace("-", " ")))
        if nome not in trovati:
            print("%-30s NON TROVATO: prova un altra ricerca in RICERCHE" % nome)
            continue
        dati = urllib.request.urlopen(urllib.request.Request(trovati[nome], headers=INT), timeout=180).read()
        io.open(dest, "wb").write(dati)
        print("%-30s %5.1f MB" % (nome, len(dati) / 1048576))


if __name__ == "__main__":
    main()
