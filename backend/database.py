import shutil
import sqlite3
import time
from contextlib import closing

from identifiants import identifiant
from scores import calculer_score

from pathlib import Path

# Base dans le dossier backend, quel que soit le dossier d'où le serveur est lancé
DB_NAME = str(Path(__file__).resolve().parent / "bases_Magali.db")

# Une seule grande table pour toutes les épreuves
TABLE = "resultats_epreuves"

# Colonnes de la table, dans l'ordre (après id et horodatage).
# Les valeurs absentes sont enregistrées en NULL (lues comme NA dans R / pandas).
COLONNES = [
    "participant",
    "epreuve",
    "partie",                  # "entrainement" / "test" / nom du tableau
    "question",                # identifiant court (voir identifiants.py), comme les colonnes
                               # de l'export une ligne par participant
    "reponse",
    "score",                   # 1 / 0 ; Similitudes : 2 / 1 / 0, 88 = orthographe, 99 = à vérifier
    "duree_reponse",           # s (précision : la milliseconde)
    "duree_lecture",           # s, Compréhension de texte : lecture de l'article (avant l'affirmation)
    "position_question",       # Similitudes et Vocabulaire : rang de présentation ;
                               # tableaux : numéro de l'item ; Barrage : rang du clic
    "position_bonne_reponse",  # Vocabulaire uniquement
    "position_symbole",        # Barrage uniquement : position de la forme cliquée dans la grille
    "is_correct",              # Barrage uniquement : 1 = la forme cliquée est une cible, 0 = erreur
    "nb_symboles_selectionnes",           # Barrage uniquement
    "nb_symboles_selectionnes_corrects",  # Barrage uniquement
    "duree_totale_epreuve",    # s
    "duree_seance",            # s, durée totale de l'expérience (toutes les lignes du participant)
    "time_stamp",              # s depuis le début de l'expérience, au moment de l'événement
    "question_texte",          # texte complet de la question, tel qu'affiché
]
TYPES = {
    "duree_reponse": "REAL", "duree_lecture": "REAL", "duree_totale_epreuve": "REAL", "duree_seance": "REAL",
    "time_stamp": "REAL", "score": "INTEGER", "position_question": "INTEGER",
    "position_bonne_reponse": "INTEGER", "position_symbole": "INTEGER", "is_correct": "INTEGER",
    "nb_symboles_selectionnes": "INTEGER", "nb_symboles_selectionnes_corrects": "INTEGER",
}
# Temps : le front les envoie en millisecondes, la base les garde en secondes
# (3 décimales, donc la même précision). PRAGMA user_version = 1 : base déjà en secondes.
COLONNES_TEMPS = ["duree_reponse", "duree_lecture", "duree_totale_epreuve", "duree_seance", "time_stamp"]
VERSION_SECONDES = 1


def en_secondes(ms):
    return None if ms is None else round(float(ms) / 1000, 3)


# Colonnes envoyées par le front (score, identifiant et texte sont calculés ici)
COLONNES_FRONT = [c for c in COLONNES if c not in ("score", "question_texte")]


def _connexion():
    return closing(sqlite3.connect(DB_NAME, timeout=10))


def _creer_table(conn, nom, anciennes=()):
    colonnes = ",\n".join(f"{c} {TYPES.get(c, 'TEXT')}" for c in COLONNES)
    autres = "".join(f",\n{c}" for c in anciennes)  # colonnes d'anciennes versions, gardées à la fin
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {nom} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            horodatage TEXT,
            {colonnes}{autres}
        )
    """)


def init_db():
    with _connexion() as conn, conn:
        _creer_table(conn, TABLE)
        colonnes = [c[1] for c in conn.execute(f"PRAGMA table_info({TABLE})")]
    if colonnes[2:2 + len(COLONNES)] != COLONNES:
        migrer(colonnes)
    with _connexion() as conn:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version < VERSION_SECONDES:
        convertir_en_secondes()


def convertir_en_secondes():
    """Base d'avant le 17/11 : temps en millisecondes -> secondes. Copie de la base avant."""
    with _connexion() as conn, conn:
        if conn.execute(f"SELECT COUNT(*) FROM {TABLE}").fetchone()[0] == 0:
            conn.execute(f"PRAGMA user_version = {VERSION_SECONDES}")  # base neuve : rien à convertir
            return
    copie = DB_NAME.replace(".db", f"_avant_secondes_{time.strftime('%Y-%m-%d_%Hh%M')}.db")
    with _connexion() as conn, closing(sqlite3.connect(copie)) as dest:
        conn.backup(dest)
    print(f"[base] temps convertis en secondes ; copie de l'ancienne base : {copie}")
    with _connexion() as conn, conn:
        conn.execute(f"UPDATE {TABLE} SET " + ", ".join(
            f"{c} = ROUND({c} / 1000.0, 3)" for c in COLONNES_TEMPS))
        conn.execute(f"PRAGMA user_version = {VERSION_SECONDES}")


def migrer(colonnes):
    """Base d'une version précédente : réécrit la table dans le nouvel ordre des colonnes
    (score à côté de la réponse), avec les identifiants courts dans "question" et le texte
    dans "question_texte". Une copie de la base est faite avant."""
    copie = DB_NAME.replace(".db", f"_avant_migration_{time.strftime('%Y-%m-%d_%Hh%M')}.db")
    with _connexion() as conn, closing(sqlite3.connect(copie)) as dest:
        conn.backup(dest)
    print(f"[base] migration vers le nouveau format ; copie de l'ancienne base : {copie}")

    anciennes = [c for c in colonnes if c not in COLONNES and c not in ("id", "horodatage")]
    with _connexion() as conn, conn:
        conn.row_factory = sqlite3.Row
        lignes = [dict(r) for r in conn.execute(f"SELECT * FROM {TABLE} ORDER BY id")]
        _creer_table(conn, "resultats_nouveau", anciennes)
        # numéros des items des tableaux d'avant le 16/11 (non envoyés par le front)
        from items_tableaux import numero_item
        for r in lignes:
            texte = r.get("question_texte") or r.get("question")
            r["question_texte"] = texte
            if r["epreuve"] in ("Barrage1", "Barrage2") and r.get("partie") in ("exercice", "test") \
                    and r.get("nb_symboles_selectionnes") is not None and r.get("position_symbole") is None:
                # ancien format : rang du clic dans question, forme dans reponse
                if r.get("question") not in (None, ""):
                    r["position_question"] = int(r["question"])
                    r["position_symbole"] = int(r["reponse"]) if r.get("reponse") not in (None, "") else None
                r["question_texte"], r["reponse"] = None, None
            if r.get("position_question") is None:
                r["position_question"] = numero_item(r["epreuve"], r.get("partie"), texte)
            r["question"] = identifiant(r["epreuve"], r.get("partie"), texte, r.get("position_question"))
            try:
                score = calculer_score(r["epreuve"], r.get("partie"), texte, r.get("reponse"))
                r["score"] = score if score is not None or r.get("score") is None else r["score"]
            except Exception:
                pass
        noms = ["id", "horodatage", *COLONNES, *anciennes]
        conn.executemany(
            f"INSERT INTO resultats_nouveau ({', '.join(noms)}) VALUES ({', '.join('?' * len(noms))})",
            [[r.get(c) for c in noms] for r in lignes])
        conn.execute(f"DROP TABLE {TABLE}")
        conn.execute(f"ALTER TABLE resultats_nouveau RENAME TO {TABLE}")


def sauvegarder_lignes(lignes):
    """Insère une liste de lignes (dictionnaires) en une seule transaction.
    Le score est calculé sur le texte de la question, puis la question est remplacée
    par son identifiant court (le texte est gardé dans question_texte)."""
    horodatage = time.strftime("%Y-%m-%d %H:%M:%S")
    valeurs = []
    for ligne in lignes:
        l = {c: ligne.get(c) for c in COLONNES_FRONT}
        if l.get("position_bonne_reponse") is None and ligne.get("options"):
            l["position_bonne_reponse"] = _position_bonne(l, ligne["options"])
        for c in COLONNES_TEMPS:
            l[c] = en_secondes(l[c])
        texte = l["question"]
        l["score"] = _score(ligne)
        l["question_texte"] = texte
        l["question"] = _identifiant(l)
        valeurs.append((horodatage, *[l[c] for c in COLONNES]))
    with _connexion() as conn, conn:
        conn.executemany(
            f"""
            INSERT INTO {TABLE} (horodatage, {", ".join(COLONNES)})
            VALUES ({", ".join(["?"] * (len(COLONNES) + 1))})
            """,
            valeurs,
        )


def _position_bonne(l, options):
    """Vocabulaire : place (1 à 3) de la bonne réponse parmi les propositions affichées.
    Calculée ici, car les bonnes réponses ne sont plus envoyées au navigateur."""
    try:
        from scores import bonnes_reponses, normaliser
        bonne = (bonnes_reponses(l["epreuve"]) or {}).get(normaliser(l["question"]))
        if bonne is None:
            return None
        for i, o in enumerate(options, start=1):
            if normaliser(o) == bonne:
                return i
    except Exception as e:
        print(f"[position] calcul impossible ({l.get('epreuve')}) : {e}")
    return None


def _identifiant(l):
    """Une erreur n'empêche jamais l'enregistrement : la question garde alors son texte."""
    try:
        return identifiant(l["epreuve"], l["partie"], l["question"], l["position_question"])
    except Exception as e:
        print(f"[identifiant] impossible ({l.get('epreuve')}) : {e}")
        return l["question"]


def _score(ligne):
    """Score de la ligne. Une erreur de calcul n'empêche jamais l'enregistrement :
    la ligne est alors gardée avec un score vide."""
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
            (en_secondes(duree_seance), participant),
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
            (en_secondes(duree_totale), participant, epreuve),
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
