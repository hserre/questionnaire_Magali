"""Calcule (ou recalcule) la colonne score pour toutes les lignes déjà enregistrées.

À lancer depuis le dossier backend, par exemple après avoir corrigé une réponse
dans un Excel d'entrée :   python calculer_scores.py
"""
import sqlite3
from collections import defaultdict

from database import DB_NAME, TABLE, init_db
from scores import SOURCES, calculer_score, normaliser, bonnes_reponses

init_db()  # ajoute la colonne score si elle n'existe pas encore
conn = sqlite3.connect(DB_NAME, timeout=10)
lignes = conn.execute(
    f"SELECT id, epreuve, partie, question, reponse FROM {TABLE} "
    f"WHERE epreuve IN ({','.join('?' * len(SOURCES))})",
    list(SOURCES),
).fetchall()

maj, bilan, introuvables = [], defaultdict(lambda: [0, 0]), defaultdict(set)
for id_, epreuve, partie, question, reponse in lignes:
    score = calculer_score(epreuve, partie, question, reponse)
    maj.append((score, id_))
    if score is not None:
        bilan[epreuve][0] += score
        bilan[epreuve][1] += 1
    elif partie in ("entrainement", "test") and normaliser(question) not in bonnes_reponses(epreuve):
        introuvables[epreuve].add(question)

with conn:
    conn.executemany(f"UPDATE {TABLE} SET score = ? WHERE id = ?", maj)
conn.close()

for epreuve in SOURCES:
    bons, total = bilan.get(epreuve, (0, 0))
    print(f"{epreuve:24s} {total:4d} réponses notées, {bons:4d} bonnes")
for epreuve, qs in introuvables.items():
    print(f"ATTENTION {epreuve} : {len(qs)} question(s) absente(s) de l'Excel :", *sorted(qs), sep="\n  ")
