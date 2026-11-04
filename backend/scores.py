"""Score de chaque réponse : 1 = bonne réponse, 0 = mauvaise réponse.

La bonne réponse est lue dans la colonne "reponse" des Excel d'entrée
(Entry_data/), en retrouvant la ligne par le texte de la question.
Les Excel sont relus automatiquement s'ils sont modifiés.

Épreuves notées :
  Vocabulaire_IT / _FR          input_vocabulaire_IT.xlsx / input_vocabulaire.xlsx
  Comprehension_IT / _FR        input_comprehension_IT.xlsx / input_comprehension.xlsx
  ComprehensionTexte_IT / _FR   reponses_comprehension_texte_IT.xlsx / reponses_comprehension_texte.xlsx
                                (bonnes réponses recopiées de ComprehensionTexte.jsx :
                                 si les articles changent, mettre ces deux fichiers à jour)

Pas de score (NULL) pour les autres épreuves, les lignes hors essais (absence...)
et les questions introuvables dans l'Excel.
"""
import re
import unicodedata
from pathlib import Path

import pandas as pd

DOSSIER = Path(__file__).resolve().parent / "Entry_data"

SOURCES = {
    "Vocabulaire_IT": "input_vocabulaire_IT.xlsx",
    "Vocabulaire_FR": "input_vocabulaire.xlsx",
    "Comprehension_IT": "input_comprehension_IT.xlsx",
    "Comprehension_FR": "input_comprehension.xlsx",
    "ComprehensionTexte_IT": "reponses_comprehension_texte_IT.xlsx",
    "ComprehensionTexte_FR": "reponses_comprehension_texte.xlsx",
}

PARTIES_NOTEES = {"entrainement", "test"}

_cache = {}  # epreuve -> (date de modification du fichier, {question: bonne réponse})


def normaliser(texte):
    """Compare les textes sans tenir compte des espaces en trop ni des espaces insécables."""
    texte = unicodedata.normalize("NFC", str(texte)).replace(" ", " ")
    return re.sub(r"\s+", " ", texte).strip()


def bonnes_reponses(epreuve):
    """{question normalisée: bonne réponse normalisée} pour une épreuve, ou None."""
    fichier = SOURCES.get(epreuve)
    if fichier is None:
        return None
    chemin = DOSSIER / fichier
    date = chemin.stat().st_mtime
    if epreuve not in _cache or _cache[epreuve][0] != date:
        df = pd.read_excel(chemin)
        df = df[df["partie"].isin(PARTIES_NOTEES)]
        cles = {normaliser(q): normaliser(r) for q, r in zip(df["question"], df["reponse"])}
        _cache[epreuve] = (date, cles)
    return _cache[epreuve][1]


def calculer_score(epreuve, partie, question, reponse):
    """1 si la réponse est la bonne, 0 sinon, None si la ligne n'est pas notée."""
    if partie not in PARTIES_NOTEES or question is None:
        return None
    cles = bonnes_reponses(epreuve)
    if cles is None:
        return None
    bonne = cles.get(normaliser(question))
    if bonne is None:
        return None
    if reponse is None:
        return 0
    return int(normaliser(reponse) == bonne)
