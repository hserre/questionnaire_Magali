import sqlite3
import time
from contextlib import closing

from scores import calculer_score

DB_NAME = "bases_Magali.db"

# Une seule grande table pour toutes les épreuves
TABLE = "resultats_epreuves"

# Colonnes remplies par le front (dans cet ordre).
# Les valeurs absentes sont enregistrées en NULL (lues comme NA dans R / pandas).
COLONNES = [
    "participant",
    "epreuve",
    "partie",                  # "entrainement" / "test" / nom du tableau
    "question",
    "reponse",
    "duree_reponse",           # ms
    "position_question",       # Similitudes et Vocabulaire uniquement
    "position_bonne_reponse",  # Vocabulaire uniquement
    "nb_symboles_selectionnes",           # Barrage uniquement
    "nb_symboles_selectionnes_corrects",  # Barrage uniquement
    "duree_totale_epreuve",    # ms
    "duree_seance",            # ms, durée totale de l'expérience (toutes les lignes du participant)
    "time_stamp",              # ms depuis le début de l'expérience, au moment de l'événement
]


def _connexion():
    return closing(sqlite3.connect(DB_NAME, timeout=10))


def init_db():
    with _connexion() as conn, conn:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {TABLE} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                horodatage TEXT,
                participant TEXT,
                epreuve TEXT,
                partie TEXT,
                question TEXT,
                reponse TEXT,
                duree_reponse REAL,
                position_question INTEGER,
                position_bonne_reponse INTEGER,
                nb_symboles_selectionnes INTEGER,
                nb_symboles_selectionnes_corrects INTEGER,
                duree_totale_epreuve REAL,
                duree_seance REAL,
                time_stamp REAL,
                score INTEGER
            )
        """)
        # Base créée avec une version précédente : on ajoute les colonnes manquantes
        # (les anciennes colonnes, comme position_dernier_item, sont laissées telles quelles)
        colonnes = [c[1] for c in conn.execute(f"PRAGMA table_info({TABLE})")]
        for nom, type_sql in [
            ("duree_seance", "REAL"),
            ("nb_symboles_selectionnes", "INTEGER"),
            ("nb_symboles_selectionnes_corrects", "INTEGER"),
            ("time_stamp", "REAL"),
            ("score", "INTEGER"),
        ]:
            if nom not in colonnes:
                conn.execute(f"ALTER TABLE {TABLE} ADD COLUMN {nom} {type_sql}")


def sauvegarder_lignes(lignes):
    """Insère une liste de lignes (dictionnaires) en une seule transaction."""
    horodatage = time.strftime("%Y-%m-%d %H:%M:%S")
    valeurs = [
        (horodatage, *[ligne.get(col) for col in COLONNES], _score(ligne))
        for ligne in lignes
    ]
    with _connexion() as conn, conn:
        conn.executemany(
            f"""
            INSERT INTO {TABLE} (horodatage, {", ".join(COLONNES)}, score)
            VALUES ({", ".join(["?"] * (len(COLONNES) + 2))})
            """,
            valeurs,
        )


def _score(ligne):
    """Score de la ligne (1 / 0 / None). Une erreur de calcul n'empêche jamais
    l'enregistrement : la ligne est alors gardée avec un score vide."""
    try:
        return calculer_score(ligne.get("epreuve"), ligne.get("partie"),
                              ligne.get("question"), ligne.get("reponse"))
    except Exception as e:
        print(f"[score] calcul impossible ({ligne.get('epreuve')}) : {e}")
        return None


def maj_duree_seance(participant, duree_seance):
    """Renseigne la durée de l'expérience sur toutes les lignes du participant,
    une fois l'expérience terminée."""
    with _connexion() as conn, conn:
        conn.execute(
            f"UPDATE {TABLE} SET duree_seance = ? WHERE participant = ?",
            (duree_seance, participant),
        )


def maj_duree_totale(participant, epreuve, duree_totale):
    """Renseigne la durée totale sur toutes les lignes d'une épreuve,
    une fois que le participant l'a terminée."""
    with _connexion() as conn, conn:
        conn.execute(
            f"""
            UPDATE {TABLE}
            SET duree_totale_epreuve = ?
            WHERE participant = ? AND epreuve = ?
            """,
            (duree_totale, participant, epreuve),
        )


# ---------------------------------------------------------------------------
# Codes participants (table existante userNames)
# ---------------------------------------------------------------------------

def code_existe(code):
    with _connexion() as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS userNames (userName TEXT)")
        ligne = conn.execute(
            "SELECT 1 FROM userNames WHERE userName = ? LIMIT 1", (str(code),)
        ).fetchone()
        return ligne is not None


def ajouter_code(code):
    with _connexion() as conn, conn:
        conn.execute("CREATE TABLE IF NOT EXISTS userNames (userName TEXT)")
        conn.execute("INSERT INTO userNames (userName) VALUES (?)", (str(code),))

