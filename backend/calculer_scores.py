"""Calcule (ou recalcule) la colonne score pour toutes les lignes déjà enregistrées.

À lancer depuis le dossier backend, par exemple après avoir corrigé une réponse
dans un Excel d'entrée ou complété le barème des Similitudes :   python calculer_scores.py

Similitudes : les réponses absentes du barème ont le score 99 (à vérifier), ou 88 si ce
sont des mots à une lettre près d'un mot du barème (faute d'orthographe probable). Elles
sont listées dans similitudes_a_coter.csv (une ligne par item et par réponse simplifiée) :
les ajouter au barème dans la bonne colonne de points, puis relancer ce script.
"""
import csv
import sqlite3
from collections import Counter, defaultdict

from database import DB_NAME, TABLE, init_db
from scores import SOURCES, calculer_score, normaliser, bonnes_reponses
from scores_similitudes import (ONGLETS as SIMILITUDES, LANGUE, A_VERIFIER, ORTHOGRAPHE, conflits,
                                item_du_bareme, simplifier)

EPREUVES = list(SOURCES) + list(SIMILITUDES)
FICHIER_A_COTER = "similitudes_a_coter.csv"

init_db()  # met la base au format actuel si besoin
conn = sqlite3.connect(DB_NAME, timeout=10)
lignes = conn.execute(
    f"SELECT id, epreuve, partie, COALESCE(question_texte, question), reponse FROM {TABLE} "
    f"WHERE epreuve IN ({','.join('?' * len(EPREUVES))})",
    EPREUVES,
).fetchall()

maj = []
bilan = defaultdict(lambda: [0, 0])     # epreuve -> [points, réponses notées]
introuvables = defaultdict(set)         # epreuve -> questions absentes des Excel / du barème
a_coter = Counter()                     # (epreuve, item, réponse simplifiée, réponse) -> nb
for id_, epreuve, partie, question, reponse in lignes:
    score = calculer_score(epreuve, partie, question, reponse)
    maj.append((score, id_))
    if score in (A_VERIFIER, ORTHOGRAPHE) and epreuve in SIMILITUDES:
        if item_du_bareme(epreuve, question) is None:
            introuvables[epreuve].add(question)
        a_coter[(epreuve, normaliser(question), score, simplifier(reponse, LANGUE[epreuve]),
                 normaliser(reponse))] += 1
    elif score is not None:
        bilan[epreuve][0] += score
        bilan[epreuve][1] += 1
    elif epreuve in SOURCES and partie in ("entrainement", "test") \
            and normaliser(question) not in bonnes_reponses(epreuve):
        introuvables[epreuve].add(question)

with conn:
    conn.executemany(f"UPDATE {TABLE} SET score = ? WHERE id = ?", maj)
conn.close()

with open(FICHIER_A_COTER, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["epreuve", "question", "code", "reponse_simplifiee", "reponse", "nb"])
    for (epreuve, question, code, cle, reponse), nb in sorted(a_coter.items()):
        w.writerow([epreuve, question, code, cle, reponse, nb])

for epreuve in EPREUVES:
    points, total = bilan.get(epreuve, (0, 0))
    unite = "points" if epreuve in SIMILITUDES else "bonnes"
    print(f"{epreuve:24s} {total:4d} réponses notées, {points:4d} {unite}")
nb_a_coter = sum(a_coter.values())
nb_88 = sum(nb for k, nb in a_coter.items() if k[2] == ORTHOGRAPHE)
print(f"\nSimilitudes : {nb_a_coter} réponse(s) à vérifier, dont {nb_88} faute(s) d'orthographe probable(s) "
      f"(code {ORTHOGRAPHE}) -> {FICHIER_A_COTER}")
for epreuve, item, valeur, a, b in conflits():
    print(f"ATTENTION {epreuve} {item} : « {valeur} » est à la fois à {a} et {b} point(s) (gardé : {max(a, b)})")
for epreuve, qs in introuvables.items():
    print(f"ATTENTION {epreuve} : {len(qs)} question(s) absente(s) de l'Excel / du barème :", *sorted(qs), sep="\n  ")
