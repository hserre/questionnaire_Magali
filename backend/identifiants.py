"""Identifiant court de chaque question, écrit dans la colonne "question" de la base
(le texte complet est gardé dans "question_texte"). Ce sont aussi les noms des colonnes
de l'export une ligne par participant (exports.py).

  Vocabulaire          vocab_IT_tranquillo         (le mot ; entraînement : vocab_IT_entr_...)
  Similitudes          simil_FR_violon_guitare     (la paire de mots)
  Compréhension        comp_IT_q03                 (numéro dans l'Excel d'entrée)
  Compréhension texte  comptexte_FR_q02            (numéro dans l'Excel des réponses)
  Stratégies           strat_ideal_t1_q05          (numéro dans la liste des items du tableau)
  Approche             approche_q12                (idem)
  Barrage              vide (rang du clic dans position_question, forme dans position_symbole)
  Accueil              madrelingua, genere, dsa...  ;  Écran : ecran_fenetre...
"""
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd

DOSSIER = Path(__file__).resolve().parent / "Entry_data"

# Épreuves, dans l'ordre du parcours, et préfixe de leurs identifiants
PREFIXES = {
    "StrategiesEtude_ideal": "strat_ideal",
    "Similitudes_IT": "simil_IT",
    "Vocabulaire_IT": "vocab_IT",
    "Comprehension_IT": "comp_IT",
    "ComprehensionTexte_IT": "comptexte_IT",
    "Barrage1": "barrage1",
    "ApprocheEtude": "approche",
    "Similitudes_FR": "simil_FR",
    "Vocabulaire_FR": "vocab_FR",
    "Comprehension_FR": "comp_FR",
    "ComprehensionTexte_FR": "comptexte_FR",
    "Barrage2": "barrage2",
    "StrategiesEtude_reel": "strat_reel",
}
# Partie -> marque dans l'identifiant (le test n'en a pas)
PARTIES = {"entrainement": "entr", "exercice": "exerc", "tableau1": "t1", "tableau2": "t2",
           "test": None, "tableau": None, "exemple": "ex"}
BARRAGES = {"Barrage1", "Barrage2"}
TABLEAUX = {"StrategiesEtude_ideal", "StrategiesEtude_reel", "ApprocheEtude"}

# Questionnaire d'accueil : libellé affiché -> identifiant (cf. LIBELLES de Bienvenue.jsx)
INFOS = {
    "Prima di cominciare, l'italiano è la tua madrelingua?": "madrelingua",
    "Per questo questionario, utilizzerai :": "ordi",
    "Sei:": "genere",
    "Data di nascita:": "data_nascita",
    "In quale università studi?": "universita",
    "Anno di corso attuale e livello di studi:": "anno_corso",
    "Posizione del francese nella classifica delle lingue studiate:": "posizione_francese",
    "Numero di anni di studio pregresso del francese:": "anni_francese",
    "Hai una diagnosi ufficiale che confermi il tuo disturbo (o i tuoi disturbi) DSA?": "dsa",
    "Quale/i DSA? (Puoi selezionare più opzioni)": "dsa_tipi",
    "Che tipo di dislessia?": "tipo_dislessia",
    "Hai una diagnosi ufficiale che confermi il tuo ADHD?": "adhd",
    "Che tipo di ADHD?": "tipo_adhd",
    "Segui attualmente un trattamento per l'ADHD?": "trattamento_adhd",
}

# Excel dans lesquels sont numérotées les questions longues
SOURCES_NUMEROS = {
    "Comprehension_IT": "input_comprehension_IT.xlsx",
    "Comprehension_FR": "input_comprehension.xlsx",
    "ComprehensionTexte_IT": "reponses_comprehension_texte_IT.xlsx",
    "ComprehensionTexte_FR": "reponses_comprehension_texte.xlsx",
}


def normaliser(texte):
    texte = unicodedata.normalize("NFC", str(texte)).replace(" ", " ")
    texte = re.sub(r"\s+", " ", texte).strip()
    return re.sub(r"\s+([?!:;.,])", r"\1", texte)


def slug(texte):
    t = unicodedata.normalize("NFKD", str(texte))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")


def mots_majuscules(texte):
    """('PIANOFORTE', 'TAMBURO') dans « In che cosa sono simili PIANOFORTE e TAMBURO? »"""
    return re.findall(r"[A-ZÀ-ÖØ-Þ]{2,}", unicodedata.normalize("NFC", str(texte)))


_cache = {}


def _numeros_excel(epreuve):
    """{(partie, question normalisée): numéro} d'après l'Excel, relu s'il change."""
    chemin = DOSSIER / SOURCES_NUMEROS[epreuve]
    date = chemin.stat().st_mtime
    if _cache.get(epreuve, (None,))[0] != date:
        df = pd.read_excel(chemin)
        numeros, compteurs = {}, {}
        for partie, q in zip(df["partie"], df["question"]):
            compteurs[partie] = compteurs.get(partie, 0) + 1
            numeros[(partie, normaliser(q))] = compteurs[partie]
        _cache[epreuve] = (date, numeros)
    return _cache[epreuve][1]


def _vide(v):
    return v is None or (isinstance(v, float) and v != v) or str(v).strip() == ""


def identifiant(epreuve, partie, question, position_question=None):
    """Identifiant court de la question, ou la question telle quelle si elle n'en a pas."""
    if epreuve in BARRAGES:
        return None if partie in ("exercice", "test") else question
    if epreuve == "infos_participant":
        return INFOS.get(question, question)
    if epreuve == "Ecran" and not _vide(question):
        return f"ecran_{question}"
    if epreuve not in PREFIXES or partie not in PARTIES or _vide(question):
        return question

    base = PREFIXES[epreuve] + (f"_{PARTIES[partie]}" if PARTIES[partie] else "")
    if epreuve.startswith("Similitudes"):
        mots = mots_majuscules(question)
        if len(mots) >= 2:
            return f"{base}_" + "_".join(slug(m) for m in mots)
    elif epreuve.startswith("Vocabulaire"):
        return f"{base}_{slug(question)}"
    elif epreuve in SOURCES_NUMEROS:
        try:
            n = _numeros_excel(epreuve).get((partie, normaliser(question)))
        except Exception:
            n = None
        if n is not None:
            return f"{base}_q{n:02d}"
    elif epreuve in TABLEAUX and not _vide(position_question):
        return f"{base}_q{int(position_question):02d}"
    # question inconnue : identifiant tiré du texte, pour ne rien perdre
    return f"{base}_{slug(question)[:40]}"
