import { API_URL } from "../config";

// Fonctions communes à toutes les épreuves pour écrire dans la table "resultats".
// Toute valeur non fournie est envoyée à null (NULL dans SQLite, NA dans R / pandas).

// Début de l'expérience = chargement de la page (ce fichier est chargé une seule fois)
export const DEBUT_EXPERIENCE = Date.now();

// ms écoulées depuis le début de l'expérience à un instant donné (par défaut : maintenant)
export const chrono = (instant = Date.now()) => instant - DEBUT_EXPERIENCE;

// Langue de l'épreuve selon le tour : 1 = italien, 2 = français
export const suffixeLangue = (tour) => (Number(tour) === 1 ? "IT" : "FR");

// Construit une ligne complète de la table
export function ligne({
  participant,
  epreuve,
  partie = null,
  question = null,
  reponse = null,
  duree_reponse = null,
  position_question = null,
  position_bonne_reponse = null,
  nb_symboles_selectionnes = null,
  nb_symboles_selectionnes_corrects = null,
  duree_totale_epreuve = null,
  duree_seance = null,
  time_stamp = chrono(), // par défaut : moment où la ligne est construite
}) {
  return {
    participant: String(participant),
    epreuve,
    partie,
    question,
    reponse,
    duree_reponse,
    position_question,
    position_bonne_reponse,
    nb_symboles_selectionnes,
    nb_symboles_selectionnes_corrects,
    duree_totale_epreuve,
    duree_seance,
    time_stamp,
  };
}

// Envoie une ou plusieurs lignes ; renvoie une promesse (jamais rejetée).
// keepalive = true : la requête part même si la page est en train de se fermer.
export function enregistrerLignes(lignes, { keepalive = false } = {}) {
  return fetch(`${API_URL}/api/sauvegarder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lignes }),
    keepalive,
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error("Sauvegarde refusée :", response.status, await response.text());
      }
    })
    .catch((err) => console.error("Erreur de sauvegarde :", err));
}

// Fin d'épreuve : renseigne la durée totale sur toutes les lignes de l'épreuve
export function enregistrerDureeTotale(participant, epreuve, dureeTotale) {
  return fetch(`${API_URL}/api/duree_epreuve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant: String(participant),
      epreuve,
      duree_totale_epreuve: dureeTotale,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error("Durée totale refusée :", response.status, await response.text());
      }
    })
    .catch((err) => console.error("Erreur de sauvegarde :", err));
}

// Fin de l'expérience : renseigne la durée totale sur toutes les lignes du participant
export function enregistrerDureeSeance(participant, dureeSeance) {
  return fetch(`${API_URL}/api/duree_seance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant: String(participant), duree_seance: dureeSeance }),
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error("Durée de séance refusée :", response.status, await response.text());
      }
    })
    .catch((err) => console.error("Erreur de sauvegarde :", err));
}

// Tableaux (échelles) : une ligne par item de la page.
// tempsClic[i] = ms entre l'affichage de la page et le dernier clic sur la ligne i.
// Si dureeTotale est fourni (dernière page), il est mis sur ces lignes puis
// propagé aux pages précédentes de la même épreuve.
export function enregistrerPageTableau({
  participant,
  epreuve,
  partie,
  items,
  reponses,
  tempsClic,
  debutPage,
  dureeTotale = null,
}) {
  const lignes = items.map((item, i) =>
    ligne({
      participant,
      epreuve,
      partie,
      question: item,
      reponse: reponses[i] ?? null,
      duree_reponse: tempsClic[i] ?? null,
      // moment du dernier clic sur la ligne (ou de la validation si aucun clic)
      time_stamp: tempsClic[i] != null ? chrono(debutPage + tempsClic[i]) : chrono(),
      duree_totale_epreuve: dureeTotale,
    })
  );

  return enregistrerLignes(lignes).then(() => {
    if (dureeTotale !== null) {
      return enregistrerDureeTotale(participant, epreuve, dureeTotale);
    }
  });
}
