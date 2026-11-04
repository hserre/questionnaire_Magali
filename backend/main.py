import os
from typing import List, Optional, Union

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    init_db,
    sauvegarder_lignes,
    maj_duree_totale,
    maj_duree_seance,
    code_existe,
    ajouter_code,
)
from utils import charger_essais_etape

app = FastAPI()

# Cette ligne permet à React d'accéder aux audios via http://localhost:8000/Entry_data/...
if os.path.exists("../Entry_data"):
    app.mount("/Entry_data", StaticFiles(directory="../Entry_data"), name="Entry_data")
elif os.path.exists("Entry_data"):
    app.mount("/Entry_data", StaticFiles(directory="Entry_data"), name="Entry_data")


# Configuration CORS pour permettre à React de communiquer avec FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation de la base de données au démarrage
init_db()

# Texte ou nombre (ex. score d'un tableau, nombre de formes cliquées au barrage)
Valeur = Optional[Union[str, int, float]]


class Ligne(BaseModel):
    participant: str
    epreuve: str
    partie: Optional[str] = None
    question: Valeur = None
    reponse: Valeur = None
    duree_reponse: Optional[float] = None
    position_question: Optional[int] = None
    position_bonne_reponse: Optional[int] = None
    nb_symboles_selectionnes: Optional[int] = None
    nb_symboles_selectionnes_corrects: Optional[int] = None
    duree_totale_epreuve: Optional[float] = None
    duree_seance: Optional[float] = None
    time_stamp: Optional[float] = None


class Lignes(BaseModel):
    lignes: List[Ligne]


class DureeTotale(BaseModel):
    participant: str
    epreuve: str
    duree_totale_epreuve: float


@app.get("/api/stimuli/{etape}")
def get_stimuli(etape: str, tour: int = Query(None)):
    if etape in {'Comprehension', 'Similitudes', 'Vocabulaire', 'Dictee'}:
        essais = charger_essais_etape(etape, tour)
        if not essais:
            raise HTTPException(status_code=404, detail="Étape non trouvée ou fichier manquant")
        return essais
    elif etape in {'checkEmail', 'checkCodes', 'checkCodesUsed'}:
        return charger_essais_etape(etape)
    raise HTTPException(status_code=404, detail="Étape inconnue")


# Toutes les épreuves enregistrent ici : une ou plusieurs lignes par appel
@app.post("/api/sauvegarder")
def sauvegarder(data: Lignes):
    try:
        lignes = [ligne.model_dump() if hasattr(ligne, "model_dump") else ligne.dict()
                  for ligne in data.lignes]
        sauvegarder_lignes(lignes)
        return {"status": "success", "nombre_lignes": len(lignes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Appelé à la fin d'une épreuve : remplit duree_totale_epreuve sur toutes ses lignes
class DureeSeance(BaseModel):
    participant: str
    duree_seance: float


# Appelé à la fin de l'expérience : remplit duree_seance sur toutes les lignes du participant
@app.post("/api/duree_seance")
def duree_seance(data: DureeSeance):
    try:
        maj_duree_seance(data.participant, data.duree_seance)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/duree_epreuve")
def duree_epreuve(data: DureeTotale):
    try:
        maj_duree_totale(data.participant, data.epreuve, data.duree_totale_epreuve)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Codes participants
# ---------------------------------------------------------------------------

@app.get("/api/check_code")
def check_code(code: str):
    return {"existe": code_existe(code)}


class NouveauCode(BaseModel):
    userName: str


@app.post("/api/add_code")
def add_code(data: NouveauCode):
    if code_existe(data.userName):
        raise HTTPException(status_code=409, detail="Code déjà utilisé")
    ajouter_code(data.userName)
    return {"status": "success"}

