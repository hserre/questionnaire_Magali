"""Exports de la base, pour l'analyse. La base elle-même n'est jamais modifiée.

Régénérés automatiquement par le serveur (au démarrage et à chaque fin de séance),
ou à la demande, depuis le dossier backend :   python exporter.py

Tout est écrit dans backend/exports/ :

  bases_Magali.xlsx
      Copie de la base telle quelle : un onglet par table, mêmes lignes, mêmes colonnes.

  projet_Magali_par_participant.xlsx  (+ .csv)
      Une ligne par participant.
      - Infos : participant, date, séance complète, durée de la séance, réponses du
        questionnaire d'accueil, isDys, écran, n_absences / duree_absences (sorties de la
        fenêtre : onglet caché ou autre fenêtre ; aussi par épreuve), page_fermee (1 si la page
        a été fermée ou rechargée avant la fin).
      - Pour chaque épreuve, dans l'ordre du parcours : score total et durée totale,
        puis pour chaque question trois colonnes :
            vocab_IT_tranquillo          la réponse
            score_vocab_IT_tranquillo    1 / 0 ; Similitudes : 2 / 1 / 0, 88 = orthographe, 99 = à vérifier
            duree_vocab_IT_tranquillo    temps de réponse (s)
        Les noms de colonnes sont les identifiants de la colonne "question" de la base
        (voir identifiants.py). Les totaux des Similitudes ne comptent pas les 88 et 99.
        Barrage : seulement les totaux (nb_selectionnes_barrage1, nb_corrects_barrage1, durée)
        et dernier_symbole_barrage1 = position dans la grille de la dernière forme
        sélectionnée (_exerc pour l'exercice). Le détail clic par clic est dans la base.
      - Au-dessus des en-têtes, une ligne regroupe les colonnes par étape de l'expérience
        (« Stratégies d'étude 1 », « Similitudes (IT) »...). Le .csv n'a que les en-têtes.
      - À la fin du tableau : position_<question> = rang de présentation de la question
        parmi celles de l'épreuve, et pour le Vocabulaire position_reponse_<question> =
        place de la bonne réponse parmi les 3 propositions (haut / milieu / bas).
      - Onglet "dictionnaire" : pour chaque colonne, l'épreuve et le texte complet de la question.
      Si une question a été répondue deux fois (test relancé), la dernière réponse est gardée.
      Les durées sont en secondes (au millième), comme dans la base.
"""
import os
import re
import sqlite3
import threading
import traceback
import unicodedata
from contextlib import closing
from pathlib import Path

import pandas as pd

DOSSIER_BACKEND = Path(__file__).resolve().parent
BASE = DOSSIER_BACKEND / "bases_Magali.db"
TABLE = "resultats_epreuves"
DOSSIER = DOSSIER_BACKEND / "exports"
NOM_LARGE = "projet_Magali_par_participant"

from identifiants import BARRAGES, INFOS, PARTIES, PREFIXES, identifiant, normaliser
from scores_similitudes import A_VERIFIER, ORTHOGRAPHE

# Compréhension : une seule validation pour tout le tableau, donc pas de durée par question
# (la durée de l'épreuve est dans duree_totale_comp_IT / _FR)
# Tableaux (Stratégies, Approche) : la durée enregistrée est le temps depuis l'affichage de
# la page, pas un temps par item ; seules les durées totales sont gardées
SANS_DUREE_PAR_QUESTION = {"Comprehension_IT", "Comprehension_FR",
                           "StrategiesEtude_ideal", "StrategiesEtude_reel", "ApprocheEtude"}
# Ordre des questions fixe (pas d'aléatoirisation) : pas de colonne position_
SANS_POSITION = set()  # toutes les épreuves ont un ordre aléatoire (sauf le Barrage, sans questions)

# Groupes affichés au-dessus des en-têtes (onglet "donnees")
GROUPES = {
    "StrategiesEtude_ideal": "Stratégies d'étude 1",
    "Similitudes_IT": "Similitudes (IT)",
    "Vocabulaire_IT": "Vocabulaire (IT)",
    "Comprehension_IT": "Compréhension (IT)",
    "ComprehensionTexte_IT": "Compréhension de texte (IT)",
    "Barrage1": "Barrage 1",
    "ApprocheEtude": "Approche de l'étude",
    "Similitudes_FR": "Similitudes (FR)",
    "Vocabulaire_FR": "Vocabulaire (FR)",
    "Comprehension_FR": "Compréhension (FR)",
    "ComprehensionTexte_FR": "Compréhension de texte (FR)",
    "Barrage2": "Barrage 2",
    "StrategiesEtude_reel": "Stratégies d'étude 2",
}
POSITIONS_VOCAB = {1: "haut", 2: "milieu", 3: "bas"}  # les 3 propositions sont affichées en colonne

# Notes ajoutées à la fin de l'onglet "dictionnaire"
NOTES = [
    ("NOTES", ""),
    ("Similitudes : score",
     "Chaque réponse est comparée au fichier « Barème Similitudes.xlsx » (onglet Italien ou Français) : "
     "2 points si elle figure dans la colonne « 2 POINTS » de l'item, 1 point dans « 1 POINT », "
     "0 dans une colonne « 0 POINT » éventuelle."),
    ("Similitudes : comparaison",
     "La réponse et le barème sont simplifiés de la même façon avant la comparaison : majuscules, accents, "
     "ponctuation et apostrophes ignorés ; articles supprimés (le, la, des, il, gli...) ; débuts de phrase "
     "supprimés (« ce sont », « c'est », « les deux », « sono », « entrambi »...) ; en français, s final du "
     "pluriel ignoré. Ex. : « Ce sont des instruments de musique » = « instrument musique »."),
    ("Similitudes : codes", "0 = faux, ou réponse vide (temps écoulé). "
     "88 = faute d'orthographe probable : réponse d'un seul mot, absente du barème, mais à une lettre près "
     "(en plus, en moins ou différente) d'un mot du barème qui vaut des points ; à vérifier. "
     "99 = réponse absente du barème ; à vérifier (la coter dans le barème puis relancer calculer_scores.py)."),
    ("Similitudes : totaux",
     "score_total_simil_IT / _FR = somme des scores des questions du test, sans les 88 et 99. "
     "Les questions d'entraînement (_entr) sont notées mais ne sont pas comptées dans le total."),
    ("Autres scores",
     "Vocabulaire, Compréhension, Compréhension de texte : 1 = bonne réponse, 0 = mauvaise réponse "
     "(bonne réponse lue dans les Excel d'entrée). score_total = somme des questions du test."),
    ("Durées : unité", "Toutes les durées sont en secondes, au millième près."),
    ("duree_seance", "Du chargement de la page de l'expérience jusqu'à la page de fin. Vide si la séance "
     "n'a pas été terminée."),
    ("duree_<question>",
     "Vocabulaire : de l'affichage du mot jusqu'au clic sur la proposition choisie (le dernier clic "
     "si le participant change d'avis), sans le temps passé ensuite à valider. "
     "Similitudes : de l'affichage de la question jusqu'à la validation, au plus le temps imparti "
     "(25 s, ou 30 s si DSA / ADHD). "
     "Compréhension de texte : de l'affichage de l'affirmation jusqu'au clic sur le bouton de confirmation "
     "(choix vrai / faux compris) ; la lecture de l'article est à part, dans duree_lecture_<question> "
     "(de l'affichage de l'article au clic sur « Continua »). Passations d'avant le 17/11/2026 : ces deux "
     "colonnes sont vides (la durée enregistrée comprenait alors la lecture). "
     "Pas de durée par question pour la Compréhension (une seule validation pour tout le tableau) "
     "ni pour les Stratégies et l'Approche."),
    ("duree_totale_<épreuve>",
     "Vocabulaire et Similitudes : de l'affichage de la première question d'entraînement jusqu'à la "
     "dernière réponse du test (entraînement et page de transition compris ; page de titre et vidéo non comprises). "
     "Compréhension : de l'affichage du tableau jusqu'au clic sur « Conferma » (titre, consignes et vidéo non compris). "
     "Compréhension de texte : de l'affichage du premier article du test jusqu'à la dernière confirmation "
     "(l'exemple n'est pas compris). "
     "Barrage : temps passé sur la grille du test (45 s au plus). "
     "Stratégies et Approche : de l'affichage de la première page de tableau jusqu'à la validation de la dernière."),
    ("duree_absences",
     "Somme des durées des sorties de la fenêtre (onglet caché, clic dans une autre application ou fenêtre), "
     "sur la séance (duree_absences) ou pendant l'épreuve (duree_absences_<épreuve>). "
     "La fermeture de la page n'est pas comptée (voir page_fermee)."),
]

_verrou = threading.Lock()


# ---------------------------------------------------------------------------

def _remplacer(chemin, ecrire):
    """Écrit à côté puis remplace d'un coup : jamais de fichier à moitié écrit."""
    tmp = chemin.with_name(chemin.stem + ".tmp" + chemin.suffix)
    ecrire(tmp)
    os.replace(tmp, chemin)


def _lire_base():
    with closing(sqlite3.connect(f"file:{BASE}?mode=ro", uri=True, timeout=10)) as conn:
        tables = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        return {t: pd.read_sql(f'SELECT * FROM "{t}"', conn) for t in tables}


def _nettoyer_excel(df):
    """Excel refuse quelques caractères de contrôle : on les retire du texte."""
    from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
    return df.apply(lambda col: col.map(
        lambda v: ILLEGAL_CHARACTERS_RE.sub("", v) if isinstance(v, str) else v)
        if col.dtype == object else col)


# ---------------------------------------------------------------------------
# 1) Copie de la base en Excel, sans transformation
# ---------------------------------------------------------------------------

def exporter_brut(tables):
    def ecrire(tmp):
        with pd.ExcelWriter(tmp, engine="openpyxl") as w:
            for nom in sorted(tables, key=lambda t: (t != TABLE, t)):  # table principale en premier
                _nettoyer_excel(tables[nom]).to_excel(w, sheet_name=nom[:31], index=False)
    _remplacer(DOSSIER / "bases_Magali.xlsx", ecrire)


# ---------------------------------------------------------------------------
# 2) Une ligne par participant
# ---------------------------------------------------------------------------

def _ordre_excel(epreuve):
    """Questions dans l'ordre de l'Excel d'entrée (épreuves à réponse unique), sinon []."""
    try:
        from scores import DOSSIER as ENTREES, SOURCES
        if epreuve not in SOURCES:
            return []
        df = pd.read_excel(ENTREES / SOURCES[epreuve])
        return [normaliser(q) for q in df.loc[df["partie"].isin(["entrainement", "test"]), "question"]]
    except Exception:
        return []


def _score_sur(r):
    """Score enregistré, ou calculé ici s'il manque (lignes d'avant le calcul des scores)."""
    if pd.notna(r["score"]):
        return r["score"]
    try:
        from scores import calculer_score
        return calculer_score(r["epreuve"], r["partie"], r["question_texte"], r["reponse"])
    except Exception:
        return None


def navigateur(ua):
    """« Safari 26.6 », « Chrome 142 »... à partir du texte d'identification du navigateur."""
    if not isinstance(ua, str):
        return None
    for nom, motif in (("Edge", r"Edg(?:A|iOS)?/(\d+)"), ("Opera", r"OPR/(\d+)"),
                       ("Firefox", r"(?:Firefox|FxiOS)/(\d+)"), ("Chrome", r"(?:Chrome|CriOS)/(\d+)"),
                       ("Safari", r"Version/(\d+(?:\.\d+)?).*Safari/")):
        m = re.search(motif, ua)
        if m:
            return f"{nom} {m.group(1)}"
    return "autre"


def systeme(ua):
    """Système d'exploitation (un iPad en mode « bureau » se présente comme un Mac)."""
    if not isinstance(ua, str):
        return None
    for nom, motif in (("iOS", r"iPhone"), ("iPadOS", r"iPad"), ("Android", r"Android"),
                       ("Windows", r"Windows"), ("macOS", r"Mac OS X"), ("ChromeOS", r"CrOS"),
                       ("Linux", r"Linux")):
        if re.search(motif, ua):
            return nom
    return "autre"


def _sorties(lignes):
    """Vraies sorties de la fenêtre (onglet caché, autre fenêtre), avec l'épreuve en cours.
    La fermeture de la page n'en fait pas partie (colonne page_fermee)."""
    absences = lignes[(lignes["partie"] == "absence") & (lignes["question"] != "fermeture_page")].copy()
    absences["pendant"] = absences["epreuve"]
    # ancien format (avant le 29/10) : epreuve = "Absence", épreuve en cours dans partie
    anciennes = lignes[lignes["epreuve"] == "Absence"].copy()
    anciennes["pendant"] = anciennes["partie"]
    return pd.concat([absences, anciennes])


def _infos(lignes):
    infos = {"date": lignes["horodatage"].iloc[0]}
    duree = lignes["duree_seance"].dropna()
    infos["seance_complete"] = int(len(duree) > 0)
    infos["duree_seance"] = duree.max() if len(duree) else None
    for _, r in lignes.iterrows():
        e, q, rep = r["epreuve"], r["question"], r["reponse"]
        if e == "infos_participant" and q in INFOS:          # libellé (ancien format)
            infos[INFOS[q]] = rep
        elif e == "infos_participant" and q in INFOS.values():  # identifiant
            infos[q] = rep
        elif e == "Ecran" and isinstance(q, str):
            infos[q if q.startswith("ecran_") else f"ecran_{q}"] = rep
        elif e == "Consentement" and q in ("versione_documenti", "versione_informativa"):
            infos["consenso_versione"] = rep
    if "ecran_navigateur" in infos:
        infos["ecran_navigateur_nom"] = navigateur(infos["ecran_navigateur"])
        infos["ecran_systeme"] = systeme(infos["ecran_navigateur"])
    infos["isDys"] = int(infos.get("dsa") == "Sì" or infos.get("adhd") == "Sì")
    sorties = _sorties(lignes)
    infos["n_absences"] = len(sorties)
    infos["duree_absences"] = sorties["duree_reponse"].fillna(0).sum()
    fermetures = lignes[(lignes["partie"] == "absence") & (lignes["question"] == "fermeture_page")]
    infos["page_fermee"] = int(len(fermetures) > 0)
    return infos


def tableau_large(df):
    """(table une ligne par participant, dictionnaire des colonnes)"""
    from scores import SOURCES

    df = df.copy()
    if "question_texte" not in df.columns:  # base pas encore migrée
        df["question_texte"] = df["question"]
        df["question"] = [identifiant(e, p, q, n) for e, p, q, n in
                          zip(df["epreuve"], df["partie"], df["question"], df["position_question"])]
    if "position_symbole" not in df.columns:
        df["position_symbole"] = None

    essais = df[df["epreuve"].isin(PREFIXES) & df["partie"].isin(PARTIES)].copy().sort_values("id")
    essais = essais.astype({c: object for c in ("question", "reponse", "question_texte")})
    # Barrage : une colonne par clic (rang du clic) ; avant le 16/11, rang dans question
    # et position de la forme dans reponse
    bar = essais["epreuve"].isin(BARRAGES)
    anc = bar & essais["position_symbole"].isna() & essais["nb_symboles_selectionnes"].notna()
    essais.loc[anc, "position_question"] = pd.to_numeric(essais.loc[anc, "question_texte"], errors="coerce")
    essais.loc[anc, "position_symbole"] = pd.to_numeric(essais.loc[anc, "reponse"], errors="coerce")
    def nom_clic(r):
        if pd.isna(r["position_question"]) or pd.isna(r["position_symbole"]):
            return None                                   # aucun clic : seulement les totaux
        marque = f"_{PARTIES[r['partie']]}" if PARTIES[r["partie"]] else ""
        return f"{PREFIXES[r['epreuve']]}{marque}_clic{int(r['position_question']):02d}"
    essais.loc[bar, "question"] = [nom_clic(r) for _, r in essais[bar].iterrows()]
    essais.loc[bar, "reponse"] = essais.loc[bar, "position_symbole"]
    essais["question_texte"] = essais["question_texte"].where(~bar, None)
    # Rang de présentation de la question dans sa partie (entraînement, test, tableau) :
    # position_question pour Similitudes et Vocabulaire, sinon ordre d'enregistrement
    # (les tableaux sont enregistrés dans l'ordre d'affichage, qui est aléatoire)
    essais["rang"] = essais.groupby(["participant", "epreuve", "partie"]).cumcount() + 1
    # (tableaux : position_question = numéro de l'item, pas son rang d'affichage)
    simvoc = ~essais["epreuve"].isin(["StrategiesEtude_ideal", "StrategiesEtude_reel", "ApprocheEtude"]) \
        & essais["position_question"].notna()
    essais.loc[simvoc, "rang"] = essais.loc[simvoc, "position_question"]

    notees = set(SOURCES) | {"Similitudes_IT", "Similitudes_FR"}

    lignes_sortie = []
    for participant, lignes in df.sort_values("id").groupby("participant", sort=False):
        ligne = {"participant": participant}
        ligne.update(_infos(lignes))
        mes_essais = essais[essais["participant"] == participant]
        mes_sorties = _sorties(lignes)
        for epreuve, prefixe in PREFIXES.items():
            e = mes_essais[mes_essais["epreuve"] == epreuve]
            if epreuve in notees:
                derniers = e[e["partie"] == "test"].drop_duplicates("question", keep="last")
                s = pd.to_numeric(derniers["score"], errors="coerce")
                s = s[s.notna() & ~s.isin([A_VERIFIER, ORTHOGRAPHE])]
                ligne[f"score_total_{prefixe}"] = s.sum() if len(s) else None
            tot = e["duree_totale_epreuve"].dropna()
            ligne[f"duree_totale_{prefixe}"] = tot.max() if len(tot) else None
            sorties = mes_sorties[mes_sorties["pendant"] == epreuve]
            ligne[f"n_absences_{prefixe}"] = len(sorties)
            ligne[f"duree_absences_{prefixe}"] = sorties["duree_reponse"].fillna(0).sum()
            if epreuve in BARRAGES:
                for partie, marque in (("exercice", "_exerc"), ("test", "")):
                    p = e[e["partie"] == partie]
                    for col, nom in (("nb_symboles_selectionnes", "nb_selectionnes"),
                                     ("nb_symboles_selectionnes_corrects", "nb_corrects")):
                        v = p[col].dropna()
                        ligne[f"{nom}_{prefixe}{marque}"] = v.max() if len(v) else None
                    # position (dans la grille) de la dernière forme sélectionnée
                    clics = p.dropna(subset=["position_question", "position_symbole"])
                    ligne[f"dernier_symbole_{prefixe}{marque}"] = (
                        clics.sort_values(["position_question", "id"])["position_symbole"].iloc[-1]
                        if len(clics) else None)
        for _, r in mes_essais.iterrows():  # dans l'ordre : la dernière réponse l'emporte
            if r["epreuve"] in BARRAGES:
                continue                  # Barrage : seulement les totaux (détail dans la base)
            nom = r["question"]
            if nom is None or (isinstance(nom, float) and pd.isna(nom)):
                continue
            ligne[nom] = r["reponse"]
            if r["epreuve"] in notees:
                ligne[f"score_{nom}"] = _score_sur(r)
            if r["epreuve"].startswith("ComprehensionTexte"):
                # avant le 17/11, la durée comprenait la lecture de l'article : laissée vide
                lecture = r.get("duree_lecture")
                if pd.notna(lecture):
                    ligne[f"duree_lecture_{nom}"] = lecture
                    ligne[f"duree_{nom}"] = r["duree_reponse"]
            elif r["epreuve"] not in SANS_DUREE_PAR_QUESTION:
                ligne[f"duree_{nom}"] = r["duree_reponse"]
            if r["epreuve"] not in SANS_POSITION:
                ligne[f"position_{nom}"] = int(r["rang"])
            if r["epreuve"].startswith("Vocabulaire") and pd.notna(r["position_bonne_reponse"]):
                ligne[f"position_reponse_{nom}"] = POSITIONS_VOCAB.get(int(r["position_bonne_reponse"]))
        lignes_sortie.append(ligne)
    tout = pd.DataFrame(lignes_sortie)

    # Ordre des colonnes : infos, puis épreuve par épreuve (totaux, puis question par question)
    infos_cols = ["participant", "date", "seance_complete", "duree_seance", "consenso_versione",
                  *INFOS.values(), "isDys"]
    infos_cols += sorted(c for c in tout.columns if c.startswith("ecran_"))
    infos_cols += ["n_absences", "duree_absences", "page_fermee"]
    ordre_cols = [c for c in infos_cols if c in tout.columns]
    dico = []
    ordre_parties = list(PARTIES)
    cols_positions, dico_positions = [], []  # mises à la fin du tableau
    for epreuve, prefixe in PREFIXES.items():
        totaux = [f"score_total_{prefixe}",
                  f"duree_totale_{prefixe}", f"n_absences_{prefixe}", f"duree_absences_{prefixe}",
                  f"nb_selectionnes_{prefixe}_exerc", f"nb_corrects_{prefixe}_exerc",
                  f"dernier_symbole_{prefixe}_exerc",
                  f"nb_selectionnes_{prefixe}", f"nb_corrects_{prefixe}", f"dernier_symbole_{prefixe}"]
        for c in totaux:
            if c in tout.columns:
                ordre_cols.append(c)
                contenu = ("position dans la grille de la dernière forme sélectionnée (1 = en haut à gauche)"
                           if c.startswith("dernier_symbole_") else
                           "sorties de la fenêtre pendant l'épreuve (onglet caché, autre fenêtre)"
                           if c.startswith("n_absences_") else
                           "durée totale de ces sorties (s)" if c.startswith("duree_absences_") else "total")
                dico.append({"colonne": c, "contenu": contenu, "epreuve": epreuve,
                             "partie": "exercice" if c.endswith("_exerc") else "test", "question": None})
        e = essais[(essais["epreuve"] == epreuve) & essais["question"].notna()]
        # questions : entraînement d'abord, puis numéro / ordre de l'Excel, sinon ordre d'affichage
        excel = _ordre_excel(epreuve)
        items = (e.groupby("question").agg(partie=("partie", "first"), texte=("question_texte", "last"),
                                           premier=("id", "min"), rang=("position_question", "median"))
                 .reset_index())
        def cle_tri(it):
            n = re.search(r"_(?:q|clic)(\d+)$", it["question"])
            texte = normaliser(it["texte"]) if pd.notna(it["texte"]) else None
            pos = excel.index(texte) if texte in excel else None
            return (ordre_parties.index(it["partie"]),
                    int(n.group(1)) if n else (pos if pos is not None else 10_000 + it["premier"]))
        for _, it in sorted(items.iterrows(), key=lambda x: cle_tri(x[1])):
            nom = it["question"]
            barrage = epreuve in BARRAGES
            for c, info in ((nom, "position de la forme cliquée (1 = en haut à gauche)" if barrage else "réponse"),
                            (f"is_correct_{nom}", "1 = la forme cliquée est une cible, 0 = erreur"),
                            (f"score_{nom}", "score (Similitudes : 88 = orthographe, 99 = à vérifier)"),
                            (f"duree_lecture_{nom}", "durée de lecture de l'article (s) : de son affichage au clic sur « Continua »"),
                            (f"duree_{nom}", "temps du clic depuis l'affichage (s)" if barrage else "durée (s)")):
                if c in tout.columns and c not in ordre_cols \
                        and not (c.startswith("score_") and tout[c].isna().all()):  # entraînement non noté
                    ordre_cols.append(c)
                    dico.append({"colonne": c, "contenu": info, "epreuve": epreuve,
                                 "partie": it["partie"], "question": it["texte"]})
            for c, info in ((f"position_{nom}", "rang de présentation parmi les questions de l'épreuve "
                             "(1 = première ; entraînement et test comptés séparément)"),
                            (f"position_reponse_{nom}", "place de la bonne réponse parmi les 3 propositions "
                             "(haut / milieu / bas)")):
                if c in tout.columns and c not in cols_positions:
                    cols_positions.append(c)
                    dico_positions.append({"colonne": c, "contenu": info, "epreuve": epreuve,
                                           "partie": it["partie"], "question": it["texte"]})
    notes = [{"colonne": None}] + [{"colonne": titre, "contenu": texte} for titre, texte in NOTES]
    return (tout.reindex(columns=ordre_cols + cols_positions),
            pd.DataFrame(dico + dico_positions + notes))


def exporter_large(tables):
    df = tables.get(TABLE)
    if df is None or df.empty:
        return
    large, dico = tableau_large(df)

    # Groupe (étape de l'expérience) de chaque colonne
    epreuve_de = dict(zip(dico["colonne"], dico["epreuve"]))
    def groupe(c):
        ep = epreuve_de.get(c)
        if ep is None or (isinstance(ep, float) and pd.isna(ep)):
            return "Participant"
        nom = GROUPES.get(ep, ep)
        return f"Positions – {nom}" if c.startswith("position_") else nom
    groupes = [groupe(c) for c in large.columns]
    dico = dico.copy()
    dico.insert(0, "groupe", [groupe(c) if isinstance(c, str) and c in large.columns else None
                              for c in dico["colonne"]])

    def ecrire_xlsx(tmp):
        from openpyxl.styles import Alignment, Font, PatternFill
        with pd.ExcelWriter(tmp, engine="openpyxl") as w:
            _nettoyer_excel(large).to_excel(w, sheet_name="donnees", index=False, startrow=1)
            _nettoyer_excel(dico).to_excel(w, sheet_name="dictionnaire", index=False)
            ws = w.sheets["donnees"]
            # ligne 1 : une cellule fusionnée par groupe, au-dessus de ses colonnes
            couleurs = ["FFDDEBF7", "FFFCE4D6"]
            debut, n = 0, 0
            for i in range(1, len(groupes) + 1):
                if i == len(groupes) or groupes[i] != groupes[debut]:
                    cell = ws.cell(row=1, column=debut + 1, value=groupes[debut])
                    cell.font = Font(bold=True)
                    cell.alignment = Alignment(horizontal="center")
                    cell.fill = PatternFill("solid", fgColor=couleurs[n % 2])
                    if i - 1 > debut:
                        ws.merge_cells(start_row=1, start_column=debut + 1, end_row=1, end_column=i)
                    debut, n = i, n + 1
            ws.freeze_panes = "B3"  # participant, groupes et en-têtes toujours visibles
    _remplacer(DOSSIER / f"{NOM_LARGE}.xlsx", ecrire_xlsx)
    _remplacer(DOSSIER / f"{NOM_LARGE}.csv",
               lambda tmp: large.to_csv(tmp, index=False, encoding="utf-8-sig"))


# ---------------------------------------------------------------------------

def regenerer():
    """Régénère tous les exports. Ne lève jamais d'erreur : elle est affichée dans le terminal."""
    with _verrou:
        try:
            DOSSIER.mkdir(exist_ok=True)
            tables = _lire_base()
            exporter_brut(tables)
            exporter_large(tables)
            return True
        except Exception:
            print("Exports : erreur (la collecte n'est pas affectée)")
            traceback.print_exc()
            return False


def regenerer_en_arriere_plan():
    """Pour le serveur : ne ralentit ni le démarrage ni la réponse au participant."""
    threading.Thread(target=regenerer, daemon=True).start()
