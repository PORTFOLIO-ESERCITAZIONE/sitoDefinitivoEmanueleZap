# -*- coding: utf-8 -*-
"""Monta i due video dell'hero come catene di clip in dissolvenza.

A sinistra i "pro" (cibo vero, dieta mediterranea), a destra i "contro"
(cibo spazzatura, consumismo alimentare). Stesso montaggio per tutti e
due, in due passaggi:
  1. le clip vengono tagliate, portate tutte a 1920x1080 (ingrandite e
     ritagliate, MAI adattate con bande) e concatenate in dissolvenza
  2. la coda viene sovrapposta in dissolvenza all'inizio, così il
     ritorno a capo del loop non si vede

I due video sono in simbiosi: stesso numero di clip, stessi secondi per
clip, stessa dissolvenza, conteggio dei fotogrammi fissato. Durano uguale
al fotogramma, le transizioni cadono nello stesso istante e il loop
riparte insieme.

Uso:
    py -3 tools/catena_hero.py            # monta pro e contro
    py -3 tools/catena_hero.py contro     # solo uno dei due

Le clip sorgente vanno in tools/clip/<nome>.mp4 (le scarica
scarica_clip.py) e vengono da Coverr: licenza libera anche per uso
commerciale, senza attribuzione. Serve `pip install imageio-ffmpeg`,
che porta con sé ffmpeg.
"""
import os
import re
import subprocess
import sys

import imageio_ffmpeg

QUI = os.path.dirname(os.path.abspath(__file__))
CLIP = os.path.join(QUI, "clip")
IMG = os.path.join(os.path.dirname(QUI), "img")

# (file in tools/clip, secondo da cui tagliare, ritocco di luminosità)
# Nei "pro" niente pentole, ciotole di plastica o metallo: sarebbero in
# contraddizione con la tesi del cliente sui materiali che contaminano.
PRO = [
    ("picking-tomatoes",            3.0, 0.06),
    ("sun-shining-on-white-grapes", 2.0, 0.00),
    ("mixing-a-fruit-salad",        1.5, 0.02),
    ("pouring-water-in-a-glass",    0.5, -0.03),
]
CONTRO = [
    ("onion-on-a-hamburger",         1.0, 0.04),
    ("pouring-a-glass-of-coca-cola", 2.0, 0.00),
    ("candy-shop",                   1.0, 0.00),
    ("mini-donuts-on-a-plate",       1.0, 0.00),
]

# Secondi per clip: 6.5 lascia 5.7 s netti fra una dissolvenza e l'altra,
# abbastanza per capire la scena. Il limite lo dà la sorgente più corta.
PER_CLIP = 6.5
FUSIONE = 0.8       # durata della dissolvenza
L, A = 1920, 1080
FPS = 24

assert len(PRO) == len(CONTRO), "pro e contro devono avere lo stesso numero di clip"

VIDEO = {
    "pro":    PRO,
    "contro": CONTRO,
}


def gradazione(luce):
    """Ritocco colore: un filo più vivo, con una virata fredda che lo
    accorda al navy del sito. `luce` corregge le clip più scure."""
    return ("eq=brightness={b}:saturation=1.14:contrast=1.06,"
            "colorbalance=bs=0.04:bm=0.02,"
            "vignette=angle=PI/7").format(b=round(0.03 + luce, 3))


def bande(ff, f, inizio):
    """Alcune clip di repertorio hanno le bande nere incise nel file
    (formato cinemascope dentro un quadro 16:9). cropdetect le misura;
    il ritaglio va fatto PRIMA di scalare, altrimenti restano."""
    r = subprocess.run([ff, "-ss", str(inizio), "-t", "2", "-i", f, "-vf",
                        "cropdetect=limit=24:round=2", "-f", "null", "-"],
                       capture_output=True, text=True)
    trovati = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", r.stderr)
    if not trovati:
        return None
    w, h, x, y = map(int, trovati[-1])
    m = re.search(r"(\d{3,4})x(\d{3,4})", r.stderr)
    if m and (w, h) == tuple(map(int, m.groups())):
        return None            # niente bande
    return "crop=%d:%d:%d:%d" % (w, h, x, y)


def durata(ff, f):
    r = subprocess.run([ff, "-i", f], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    h, mi, se = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(se)


def monta(ff, nome, scaletta):
    uscita = os.path.join(IMG, "hero-%s.mp4" % nome)
    leggera = os.path.join(IMG, "hero-%s-720.mp4" % nome)
    poster = os.path.join(IMG, "hero-%s-poster.jpg" % nome)
    grezzo = os.path.join(QUI, "hero-%s-grezzo.mp4" % nome)

    # --- passaggio 1: taglia, uniforma e concatena in dissolvenza ---
    ingressi, filtri, etichette = [], [], []
    for i, (clip, inizio, luce) in enumerate(scaletta):
        f = os.path.join(CLIP, clip + ".mp4")
        if not os.path.exists(f):
            raise SystemExit("manca %s: va scaricata con scarica_clip.py" % f)
        disponibile = durata(ff, f) - inizio
        if disponibile < PER_CLIP:
            raise SystemExit("%s: da %.1fs restano %.1fs, servono %.1f"
                             % (clip, inizio, disponibile, PER_CLIP))
        ingressi += ["-ss", str(inizio), "-t", str(PER_CLIP), "-i", f]
        taglio = bande(ff, f, inizio)
        if taglio:
            print("  %s: bande nere nel file, %s" % (clip, taglio))
        # force_original_aspect_ratio=increase + crop: la clip riempie
        # sempre tutto il quadro. Con "decrease" o pad restano le bande.
        # xfade vuole un frame rate costante: setpts va PRIMA di fps.
        filtri.append(
            "[{i}:v]{pre}scale={L}:{A}:force_original_aspect_ratio=increase,"
            "crop={L}:{A},setsar=1,{g},setpts=PTS-STARTPTS,fps={fps},"
            "format=yuv420p[v{i}]"
            .format(i=i, L=L, A=A, fps=FPS, g=gradazione(luce),
                    pre=(taglio + ",") if taglio else "")
        )
        etichette.append("[v%d]" % i)

    catena, prec, offset = [], etichette[0], PER_CLIP - FUSIONE
    for i in range(1, len(etichette)):
        out = "[x%d]" % i
        catena.append("%s%sxfade=transition=fade:duration=%s:offset=%s%s"
                      % (prec, etichette[i], FUSIONE, round(offset, 3), out))
        prec = out
        if i < len(etichette) - 1:
            offset += PER_CLIP - FUSIONE

    cmd = [ff, "-y"] + ingressi + ["-filter_complex", ";".join(filtri + catena),
           "-map", prec, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24",
           "-preset", "medium", "-an", grezzo]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        raise SystemExit(nome + ": passaggio 1 fallito")
    tot = durata(ff, grezzo)

    # --- passaggio 2: la coda si dissolve sull'inizio, loop chiuso ---
    utile = tot - FUSIONE
    filtro2 = (
        "[0:v]fps={fps},format=yuv420p,split=2[s1][s2];"
        "[s1]trim=0:{u},setpts=PTS-STARTPTS[a];"
        "[s2]trim={u}:{t},setpts=PTS-STARTPTS,fps={fps}[b];"
        "[a]split[a1][a2];"
        "[a1]trim=0:{f},setpts=PTS-STARTPTS,fps={fps}[testa];"
        "[a2]trim={f}:{u},setpts=PTS-STARTPTS[resto];"
        "[b][testa]xfade=transition=fade:duration={f}:offset=0[giunta];"
        "[giunta][resto]concat=n=2:v=1:a=0[v]"
    ).format(u=round(utile, 3), t=round(tot, 3), f=FUSIONE, fps=FPS)

    # Conteggio fisso dei fotogrammi: una sorgente può uscire corta di un
    # frame e i due video devono essere identici, altrimenti col loop si
    # sfasano di un fotogramma a giro.
    fotogrammi = int(len(scaletta) * (PER_CLIP - FUSIONE) * FPS) - 1
    cmd2 = [ff, "-y", "-i", grezzo, "-filter_complex", filtro2, "-map", "[v]",
            "-frames:v", str(fotogrammi),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30",
            "-preset", "slow", "-movflags", "+faststart", "-an", uscita]
    r2 = subprocess.run(cmd2, capture_output=True, text=True)
    if r2.returncode != 0:
        print(r2.stderr[-2000:])
        raise SystemExit(nome + ": passaggio 2 fallito")
    os.remove(grezzo)

    # --- versione 720p per i telefoni e poster ---
    r3 = subprocess.run([ff, "-y", "-i", uscita, "-vf", "scale=1280:720:flags=lanczos",
                         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "31",
                         "-preset", "slow", "-movflags", "+faststart", "-an", leggera],
                        capture_output=True, text=True)
    if r3.returncode != 0:
        print(r3.stderr[-1200:])
        raise SystemExit(nome + ": 720p fallita")
    subprocess.run([ff, "-y", "-i", uscita, "-frames:v", "1", "-q:v", "4", poster],
                   capture_output=True)

    print("hero-%s: %d clip, %.1fs, %d fotogrammi | 1080p %.0f KB, 720p %.0f KB, poster %.0f KB"
          % (nome, len(scaletta), durata(ff, uscita), fotogrammi,
             os.path.getsize(uscita) / 1024, os.path.getsize(leggera) / 1024,
             os.path.getsize(poster) / 1024))


def main():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    voluti = sys.argv[1:] or list(VIDEO)
    for nome in voluti:
        monta(ff, nome, VIDEO[nome])


if __name__ == "__main__":
    main()
