# projet_Magali_prod — lancer l'expérience (version production)

Un seul serveur, FastAPI, qui envoie les pages de l'expérience ET enregistre les réponses.
Pas de ngrok, pas de `npm run dev`.

## 1. Fabriquer le frontend (à refaire après chaque modification de frontend/src)

    cd ~/code/projet_Magali_prod/frontend
    npm run build            # écrit les fichiers dans frontend/dist

## 2. Lancer le serveur

    cd ~/code/projet_Magali_prod/backend
    source ../.venv/bin/activate
    uvicorn main:app --port 8000

L'expérience est sur http://localhost:8000/questionnaire/
(raccourci de test : http://localhost:8000/questionnaire/?etape=Vocabulaire).

## Chemin /questionnaire/

Sur le serveur, l'expérience est à http://adresse/questionnaire/ (le proxy y envoie les
participants). Ce préfixe est fixé à deux endroits, à garder identiques :
- frontend/vite.config.js : `const BASE = "/questionnaire/";` (puis relancer npm run build)
- backend/main.py : `PREFIXE` (variable d'environnement PREFIXE_URL, "/questionnaire" par défaut)
Que le proxy transmette le préfixe à FastAPI ou le retire, les deux fonctionnent.

Sur une machine virtuelle / un serveur, pour qu'elle soit accessible depuis d'autres
ordinateurs : `uvicorn main:app --host 0.0.0.0 --port 8000`.

## Données

- Base : backend/bases_Magali.db (créée vide au premier lancement)
- Exports : backend/exports/ (régénérés au démarrage et à chaque fin de séance ;
  à la demande : `python exporter.py` depuis backend, environnement activé)
- Scores à recalculer après une modification des Excel ou du barème :
  `python calculer_scores.py` depuis backend
