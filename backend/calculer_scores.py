"""Calcule (ou recalcule) la colonne score pour toutes les lignes déjà enregistrées.

À lancer depuis le dossier backend, par exemple après avoir corrigé une réponse
dans un Excel d'entrée ou complété le barème des Similitudes :   python calculer_scores.py

Similitudes : les réponses absentes du barème restent sans score. Elles sont listées
dans similitudes_a_coter.csv (une ligne par item et par réponse simplifiée) : les ajouter
au barème dans la bonne colonne de points, puis relancer ce script.
"""
import csv
import sqlite3
from collections import Counter, defaultdict

from database import DB_NAME, TABLE, init_db
from scores import SOURCES, calculer_score, normaliser, bonnes_reponses
from scores_similitudes import ONGLETS as SIMILITUDES, LANGUE, conflits, item_du_bareme, simplifier

EPREUVES = list(SOURCES) + list(SIMILITUDES)
FICHIER_A_COTER = "similitudes_a_coter.csv"

init_db()  # ajoute la colonne score si elle n'existe pas encore
conn = sqlite3.connect(DB_NAME, timeout=10)
lignes = conn.execute(
    f"SELECT id, epreuve, partie, question, reponse FROM {TABLE} "
    f"WHERE epreuve IN ({','.join('?' * len(EPREUVES))})",
    EPREUVES,
).fetchall()

maj = []
bilan = defaultdict(lambda: [0, 0])     # epreuve -> [points, réponses notées]
introuvables = defaultdict(set)         # epreuve -> questions absentes des Excel / du barème
a_coter = Counter()                     # (epreuve, question, réponse simplifiée, réponse) -> nb
items_vides = defaultdict(set)
for id_, epreuve, partie, question, reponse in lignes:
    score = calculer_score(epreuve, partie, question, reponse)
    maj.append((score, id_))
    if score is not None:
        bilan[epreuve][0] += score
        bilan[epreuve][1] += 1
    elif epreuve in SIMILITUDES:
        if partie != "test":
            continue
        bareme = item_du_bareme(epreuve, question)
        if bareme is None:
            introuvables[epreuve].add(question)
        elif not bareme:
            items_vides[epreuve].add(normaliser(question))
        else:
            a_coter[(epreuve, normaliser(question), simplifier(reponse, LANGUE[epreuve]),
                     normaliser(reponse))] += 1
    elif partie in ("entrainement", "test") and normaliser(question) not in bonnes_reponses(epreuve):
        introuvables[epreuve].add(question)

with conn:
    conn.executemany(f"UPDATE {TABLE} SET score = ? WHERE id = ?", maj)
conn.close()

with open(FICHIER_A_COTER, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["epreuve", "question", "reponse_simplifiee", "reponse", "nb"])
    for (epreuve, question, cle, reponse), nb in sorted(a_coter.items()):
        w.writerow([epreuve, question, cle, reponse, nb])

for epreuve in EPREUVES:
    points, total = bilan.get(epreuve, (0, 0))
    unite = "points" if epreuve in SIMILITUDES else "bonnes"
    print(f"{epreuve:24s} {total:4d} réponses notées, {points:4d} {unite}")
nb_a_coter = sum(a_coter.values())
print(f"\nSimilitudes : {nb_a_coter} réponse(s) absente(s) du barème, à coter -> {FICHIER_A_COTER}")
for epreuve, qs in items_vides.items():
    print(f"ATTENTION {epreuve} : item(s) sans réponses dans le barème (non notés) :", *sorted(qs), sep="\n  ")
for epreuve, item, valeur, a, b in conflits():
    print(f"ATTENTION {epreuve} {item} : « {valeur} » est à la fois à {a} et {b} point(s) (gardé : {max(a, b)})")
for epreuve, qs in introuvables.items():
    print(f"ATTENTION {epreuve} : {len(qs)} question(s) absente(s) de l'Excel / du barème :", *sorted(qs), sep="\n  ")
