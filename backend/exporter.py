"""Régénère à la demande les exports de la base (voir exports.py), sans modifier la base.

À lancer depuis le dossier backend :   python exporter.py
Résultat dans backend/exports/
"""
from exports import DOSSIER, regenerer

if regenerer():
    print(f"Exports à jour dans {DOSSIER}")
