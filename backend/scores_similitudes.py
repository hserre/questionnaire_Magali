"""Score de l'épreuve Similitudes : 2, 1 ou 0 point, d'après Entry_data/Bareme_Similitudes.xlsx.

Le barème a un onglet par langue ("Italien" -> Similitudes_IT, "Français" -> Similitudes_FR).
Dans chaque onglet : colonne A = l'item ("PIANOFORTE / TAMBURO"), sur la première ligne de l'item ;
les colonnes dont l'en-tête contient "1 POINT" / "2 POINTS" listent les réponses acceptées.
Une colonne "0 POINT" peut être ajoutée pour les réponses jugées fausses.

Les réponses sont comparées après simplification, appliquée de la même façon au barème
et à la réponse : majuscules/minuscules, accents, ponctuation, articles ("des", "il"...),
début de phrase ("ce sont", "c'est", "les deux", "sono", "entrambi"...) et, en français,
le "s" du pluriel. Ainsi "Instruments de musique" = "Ce sont des instruments de musique".

Résultat :
  2 / 1 / 0  si la réponse simplifiée est dans le barème (0 aussi pour une réponse vide) ;
  None       si la réponse n'est pas dans le barème : elle est à coter à la main
             (l'ajouter au barème, puis relancer calculer_scores.py).
"""
import re
import unicodedata
from pathlib import Path

import openpyxl

FICHIER = Path(__file__).resolve().parent / "Entry_data" / "Bareme_Similitudes.xlsx"
ONGLETS = {"Similitudes_IT": "Italien", "Similitudes_FR": "Français"}
LANGUE = {"Similitudes_IT": "it", "Similitudes_FR": "fr"}

# Mots supprimés partout (articles et petits mots de liaison)
MOTS_VIDES = {
    "fr": {"le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "au", "aux", "et"},
    "it": {"il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una", "di", "del", "dello",
           "della", "dei", "degli", "delle", "dell", "d", "e"},
}
# Débuts de phrase supprimés (déjà sans accents ni apostrophes)
DEBUTS = {
    "fr": ["toutes les deux", "tous les deux", "tous deux", "toutes deux", "les deux",
           "ce sont", "ca sont", "c est", "ca", "cela", "ce", "ils sont", "elles sont",
           "ils", "elles", "sont", "deux", "on"],
    "it": ["sono entrambi", "sono entrambe", "sono tutti e due", "sono tutte e due",
           "tutti e due", "tutte e due", "entrambi", "entrambe", "ambedue", "sono", "sono dei",
           "sono delle", "si tratta di"],
}


def sans_accents(texte):
    texte = unicodedata.normalize("NFKD", str(texte))
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return texte.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")


def simplifier(texte, langue):
    """Forme simplifiée d'une réponse, pour la comparer au barème."""
    t = sans_accents(texte).lower()
    t = re.sub(r"[^a-z0-9³]+", " ", t).strip()   # apostrophes, ponctuation -> espace
    # Débuts de phrase (répété : "ce sont tous les deux des...")
    change = True
    while change and t:
        change = False
        for debut in DEBUTS[langue]:
            if t == debut:
                break
            if t.startswith(debut + " "):
                t = t[len(debut) + 1:]
                change = True
                break
    mots = [m for m in t.split() if m not in MOTS_VIDES[langue]]
    if langue == "fr":
        mots = [m[:-1] if len(m) > 3 and m.endswith("s") else m for m in mots]
    return " ".join(mots)


def cle_item(texte):
    """('PIANOFORTE', 'TAMBURO') à partir de l'item du barème ou de la question affichée."""
    mots = re.findall(r"[A-ZÀ-ÖØ-Þ]{2,}", unicodedata.normalize("NFC", str(texte)))
    return tuple(sans_accents(m) for m in mots)


_cache = {"date": None, "baremes": {}, "conflits": []}


def baremes():
    """{epreuve: {cle_item: {reponse simplifiée: points}}}, relu si le fichier change."""
    date = FICHIER.stat().st_mtime
    if _cache["date"] == date:
        return _cache["baremes"]
    wb = openpyxl.load_workbook(FICHIER, read_only=True, data_only=True)
    resultat, conflits = {}, []
    for epreuve, onglet in ONGLETS.items():
        langue = LANGUE[epreuve]
        lignes = list(wb[onglet].iter_rows(values_only=True))
        colonnes = {}  # indice de colonne -> points
        for i, entete in enumerate(lignes[0]):
            m = re.match(r"\s*(\d)\s*POINT", str(entete or ""), re.I)
            if m:
                colonnes[i] = int(m.group(1))
        items, item = {}, None
        for ligne in lignes[1:]:
            if ligne[0] not in (None, ""):
                item = cle_item(ligne[0])
                items.setdefault(item, {})
            if item is None:
                continue
            for i, points in colonnes.items():
                valeur = ligne[i] if i < len(ligne) else None
                if valeur in (None, ""):
                    continue
                cle = simplifier(valeur, langue)
                if not cle:
                    continue
                ancien = items[item].get(cle)
                if ancien is not None and ancien != points:
                    conflits.append((epreuve, " / ".join(item), str(valeur), ancien, points))
                    points = max(ancien, points)
                items[item][cle] = points
        resultat[epreuve] = items
    wb.close()
    _cache.update(date=date, baremes=resultat, conflits=conflits)
    return resultat


def conflits():
    """Réponses présentes dans deux colonnes de points différentes (la plus haute est gardée)."""
    baremes()
    return _cache["conflits"]


def item_du_bareme(epreuve, question):
    """Le barème de l'item de cette question ({} si l'item est vide), ou None s'il est introuvable."""
    return baremes().get(epreuve, {}).get(cle_item(question))


def score_similitudes(epreuve, partie, question, reponse):
    if partie != "test" or question is None:
        return None
    bareme = item_du_bareme(epreuve, question)
    if not bareme:          # item introuvable, ou sans réponses dans le barème (BRAS / JAMBE...)
        return None
    cle = simplifier(reponse or "", LANGUE[epreuve])
    if not cle:
        return 0            # réponse vide (temps écoulé)
    return bareme.get(cle)  # None = à coter à la main
