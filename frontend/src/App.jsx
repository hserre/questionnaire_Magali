import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { API_URL } from "./config";


import CheckEmail from "./components/CheckEmail";
import Bienvenue from "./components/Bienvenue";
import TestBarrage from "./components/TestBarrage";
import TestBarrage2 from "./components/TestBarrage2";
import Similitudes from "./components/Similitudes";
import Vocabulaire from "./components/Vocabulaire";
import Comprehension from "./components/Comprehension";
import ComprehensionTexte from "./components/ComprehensionTexte";
import StrategiesEtude from "./components/StrategiesEtude";
import StrategiesEtude2 from "./components/StrategiesEtude2";
import ApprocheEtude from "./components/ApprocheEtude";
import {
  ligne,
  enregistrerLignes,
  enregistrerDureeSeance,
  suffixeLangue,
  DEBUT_EXPERIENCE,
  chrono,
} from "./components/sauvegarde";

// Déroulement complet de la séance, après "Bienvenue" et avant "Fin".
// Pour modifier l'ordre, il suffit de changer cette liste.
// "groupe" = nom du bouton du bandeau sous lequel l'étape est regroupée.
// Les étapes qui ont le même groupe allument le même bouton.
const parcours = [
  { etape: "StrategiesEtude", tour: 1, groupe: "Strategie di studio (1)" },

  // Tour 1
  { etape: "Similitudes", tour: 1, groupe: "Prove di italiano" },
  { etape: "Vocabulaire", tour: 1, groupe: "Prove di italiano" },
  { etape: "Comprehension", tour: 1, groupe: "Prove di italiano" },
  { etape: "ComprehensionTexte", tour: 1, groupe: "Prove di italiano" },
  { etape: "TestBarrage", tour: 1, groupe: "Test cognitivo (1)" },
  { etape: "ApprocheEtude", tour: 1, groupe: "Approccio allo studio" },

  // Tour 2
  { etape: "Similitudes", tour: 2, groupe: "Prove di francese" },
  { etape: "Vocabulaire", tour: 2, groupe: "Prove di francese" },
  { etape: "Comprehension", tour: 2, groupe: "Prove di francese" },
  { etape: "ComprehensionTexte", tour: 2, groupe: "Prove di francese" },

  { etape: "TestBarrage2", tour: 2, groupe: "Test cognitivo (2)" },
  { etape: "StrategiesEtude2", tour: 1, groupe: "Strategie di studio (2)" },
];

// Nom enregistré pour chaque étape : le même que la colonne "epreuve" des
// lignes écrites par le composant, pour pouvoir relier les tables entre elles
const NOMS_EPREUVES = {
  StrategiesEtude: "StrategiesEtude_ideal",
  StrategiesEtude2: "StrategiesEtude_reel",
  TestBarrage: "Barrage1",
  TestBarrage2: "Barrage2",
  ApprocheEtude: "ApprocheEtude",
};
const EPREUVES_BILINGUES = ["Similitudes", "Vocabulaire", "Comprehension", "ComprehensionTexte"];

// index : -1 = accueil, 0..n-1 = parcours, n = fin
function nomEtape(index) {
  if (index === -1) return "infos_participant";
  if (index >= parcours.length) return "Fin";
  const { etape, tour } = parcours[index];
  if (EPREUVES_BILINGUES.includes(etape)) return `${etape}_${suffixeLangue(tour)}`;
  return NOMS_EPREUVES[etape] ?? etape;
}

// Liste des boutons du bandeau, dans l'ordre du parcours (sans doublons)
const groupes = parcours.reduce(
  (liste, p) => (liste.includes(p.groupe) ? liste : [...liste, p.groupe]),
  []
);

// ---------- Bandeau des étapes ----------

const styleBandeau = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  display: "flex",
  flexWrap: "nowrap",
  justifyContent: "center",
  alignItems: "center",
  gap: "1svh",
  height: "var(--h-bandeau)",
  boxSizing: "border-box",
  padding: "0 1svw",
  backgroundColor: "rgb(230,230,250)",
  borderBottom: "1px solid rgba(0,0,0,0.1)",
};

// Étape à venir : discrète
const stylePastille = {
  padding: "6px 14px",
  borderRadius: "999px",
  fontSize: "14px",
  fontFamily: "Verdana, sans-serif",
  color: "#6b6b80",
  backgroundColor: "transparent",
  border: "1px solid rgba(0,0,0,0.2)",
  transition: "all 0.3s ease",
  userSelect: "none",
};

// Étape terminée : fond blanc translucide
const stylePastilleFaite = {
  color: "#333",
  backgroundColor: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(91,60,196,0.4)",
};

// Étape en cours : "allumée"
const stylePastilleActive = {
  color: "white",
  fontWeight: "bold",
  backgroundColor: "#5b3cc4",
  border: "1px solid #5b3cc4",
  boxShadow: "0 0 10px 2px rgba(91,60,196,0.55)",
};

function BandeauEtapes({ index }) {
  // Position du groupe en cours ; sur la page "Fin", tous les groupes sont terminés
  const groupeActuel =
    index >= parcours.length
      ? groupes.length
      : groupes.indexOf(parcours[index].groupe);

  return (
    <div style={styleBandeau}>
      {groupes.map((nom, i) => (
        <span
          key={nom}
          style={{
            ...stylePastille,
            ...(i < groupeActuel ? stylePastilleFaite : {}),
            ...(i === groupeActuel ? stylePastilleActive : {}),
          }}
        >
          {nom}
        </span>
      ))}
    </div>
  );
}

export default function App() {

  const videoRef = useRef(null);

  const jouerVideo = () => {
      videoRef.current?.play().catch(err => console.error("Lecture bloquée :", err));
  };
        

  const [participant, setParticipant] = useState("");
  const [isDys, setIsDys] = useState(0);

  // participantRef : le code est disponible immédiatement, même dans la fonction
  // appelée juste après setParticipant (fin de Bienvenue) et dans les écouteurs
  const participantRef = useRef("");
  const definirParticipant = (code) => {
    participantRef.current = code;
    setParticipant(code);
  };

  // Chronos : début de l'expérience (chargement de la page) et début de l'étape en cours
  const debutSeance = useRef(DEBUT_EXPERIENCE);
  const debutEtape = useRef(debutSeance.current);

  // -1 = Bienvenue, 0 à parcours.length - 1 = étapes du parcours,
  // parcours.length = Fin
  const [indexParcours, setIndexParcours] = useState(-1);

  const etapeGlobal =
    indexParcours === -1
      ? "Bienvenue"
      : indexParcours >= parcours.length
      ? "Fin"
      : parcours[indexParcours].etape;

  // Tour en cours (1 ou 2), transmis aux composants qui en ont besoin
  const tour = parcours[indexParcours]?.tour ?? 1;

  // Début de l'étape en cours (utilisé si la page est fermée avant la fin)
  const changerEtape = () => {
    debutEtape.current = Date.now();
  };

  const terminerSeance = () => {
    // Durée totale de l'expérience, du chargement de la page à la fin,
    // reportée dans la colonne duree_seance de toutes les lignes du participant
    const dureeSeance = Date.now() - debutSeance.current;
    enregistrerDureeSeance(participantRef.current, dureeSeance);

    setIndexParcours(parcours.length); // page "Fin"
  };

  const passerEtapeSuivante = () => {
    changerEtape();

    // Étape suivante du parcours (depuis Bienvenue : la première), ou fin de la séance
    if (indexParcours < parcours.length - 1) {
      setIndexParcours(indexParcours + 1);
    } else {
      terminerSeance();
    }
  };

  // Mesures d'écran : une ligne par mesure, envoyées une fois, dès que le code existe
  useEffect(() => {
    if (!participant) return;

    const mesures = {
      fenetre: `${window.innerWidth}x${window.innerHeight}`,
      ecran: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      navigateur: navigator.userAgent,
    };

    enregistrerLignes(
      Object.entries(mesures).map(([nom, valeur]) =>
        ligne({ participant, epreuve: "Ecran", question: nom, reponse: valeur })
      )
    );
  }, [participant]);

  // Sorties de la fenêtre de l'expérience : une ligne par sortie
  //  epreuve       = épreuve pendant laquelle le participant est parti
  //  partie        = "absence"
  //  question      = "onglet_cache"  (autre onglet, navigateur réduit)
  //                  "autre_fenetre" (clic dans une autre application ou fenêtre,
  //                                   y compris une alerte ou une notification système)
  //  duree_reponse = durée de l'absence (ms)
  // Si la page est fermée ou rechargée avant la fin : ligne "fermeture_page"
  // (et l'absence en cours éventuelle est enregistrée jusqu'à ce moment).
  const absence = useRef(null); // { debut, type } pendant une absence
  const indexRef = useRef(indexParcours);
  indexRef.current = indexParcours; // toujours l'étape en cours, même dans les écouteurs

  useEffect(() => {
    if (!participant) return;

    const ligneAbsence = (fin) =>
      ligne({
        participant: participantRef.current,
        epreuve: nomEtape(indexRef.current), // épreuve pendant laquelle il est parti
        partie: "absence",
        question: absence.current.type,
        duree_reponse: fin - absence.current.debut,
        time_stamp: chrono(absence.current.debut), // moment du départ
      });

    const quitter = (type) => {
      if (absence.current === null) {
        absence.current = { debut: Date.now(), type };
      } else if (type === "onglet_cache") {
        // la fenêtre perd d'abord le focus, puis l'onglet est caché : même sortie
        absence.current.type = "onglet_cache";
      }
    };

    const revenir = () => {
      if (absence.current === null) return;
      enregistrerLignes([ligneAbsence(Date.now())]);
      absence.current = null;
    };

    const surVisibilite = () =>
      document.hidden ? quitter("onglet_cache") : revenir();
    const surBlur = () => quitter("autre_fenetre");

    const surFermeture = () => {
      if (indexRef.current >= parcours.length) return; // page "Fin" : fermeture normale
      const maintenant = Date.now();
      const lignes = [];
      if (absence.current !== null) lignes.push(ligneAbsence(maintenant));
      lignes.push(
        ligne({
          participant: participantRef.current,
          epreuve: nomEtape(indexRef.current),
          partie: "absence",
          question: "fermeture_page",
          duree_reponse: maintenant - debutEtape.current, // temps passé sur l'étape
          duree_seance: maintenant - debutSeance.current, // temps depuis le début de l'expérience
        })
      );
      absence.current = null;
      enregistrerLignes(lignes, { keepalive: true });
    };

    window.addEventListener("blur", surBlur);
    window.addEventListener("focus", revenir);
    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("pagehide", surFermeture);

    return () => {
      window.removeEventListener("blur", surBlur);
      window.removeEventListener("focus", revenir);
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("pagehide", surFermeture);
    };
  }, [participant]);

    //////////////////////////////////

  return (
    <div style={{ /* ... */ }}>
      {/* Bandeau visible dès que le parcours a commencé (pas sur Bienvenue) */}
      {indexParcours >= 0 && <BandeauEtapes index={indexParcours} />}

      {etapeGlobal === "Bienvenue" && (
        <Bienvenue
          onComplete={passerEtapeSuivante}
          setParticipant={definirParticipant}
          setIsDys={setIsDys}
        />
      )}

      {etapeGlobal === "StrategiesEtude" && (
        <StrategiesEtude
          participant={participant}
          onComplete={passerEtapeSuivante}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "Similitudes" && (
        <Similitudes
          participant={participant}
          onComplete={passerEtapeSuivante}
          tour={tour}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "Vocabulaire" && (
        <Vocabulaire
          participant={participant}
          onComplete={passerEtapeSuivante}
          tour={tour}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "Comprehension" && (
        <Comprehension
          participant={participant}
          onComplete={passerEtapeSuivante}
          tour={tour}
          isDys={isDys}
        />
      )}


      {etapeGlobal === "ComprehensionTexte" && (
        <ComprehensionTexte
          participant={participant}
          onComplete={passerEtapeSuivante}
          tour={tour}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "TestBarrage" && (
        <TestBarrage
          participant={participant}
          onComplete={passerEtapeSuivante}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "TestBarrage2" && (
        <TestBarrage2
          participant={participant}
          onComplete={passerEtapeSuivante}
          isDys={isDys}
        />
      )}

    {etapeGlobal === "ApprocheEtude" && (
        <ApprocheEtude
          participant={participant}
          onComplete={passerEtapeSuivante}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "StrategiesEtude2" && (
        <StrategiesEtude2
          participant={participant}
          onComplete={passerEtapeSuivante}
          isDys={isDys}
        />
      )}

      {etapeGlobal === "Fin" && (
    <div style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
    }}>
        <h1>
          Grazie per la partecipazione!<br></br>
          <br></br> Puoi chiudere la pagina.
        </h1 >
        <img
            src="/videos/fireworks.gif"
            alt="Description du GIF"
            style={{ width: "500px",
              marginTop:"5svh"}}
        />

        </div> 

      )}
    </div>
  );
}

const styleBoutonContinuer = {
  backgroundColor: "white",
  color: "black",
  padding: "10px 40px",
  fontSize: "20px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  cursor: "pointer",
  display: "block",
  margin: "20px auto 0 auto",
  width: "auto",
};
