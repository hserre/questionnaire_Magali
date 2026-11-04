import React, { useState, useRef } from "react";
import "./App.css";
import { API_URL } from "./config";

import CheckEmail from "./components/CheckEmail";
import Bienvenue from "./components/Bienvenue";
import TestBarrage from "./components/TestBarrage";
import TestBarrage2 from "./components/TestBarrage2";
import Similitudes from "./components/Similitudes";
import Vocabulaire from "./components/Vocabulaire";
import Comprehension from "./components/Comprehension";
import Dictee from "./components/Dictee";
import ComprehensionTexte from "./components/ComprehensionTexte";
import StrategiesEtude from "./components/StrategiesEtude";


export default function App() {
  const [etapeGlobal, setEtapeGlobal] = useState("Bienvenue");
  const [participant, setParticipant] = useState("");
  const [tour, setTour] = useState(1); // 1er ou 2e passage
  const [isDys, setIsDys] = useState(0);
  const debutSeance = useRef(null);
 
  // Étapes répétées 2 fois
  const etapesRepetees = [
    "Similitudes",
    "Vocabulaire",
    "Comprehension",
    "ComprehensionTexte"
  ];

  // Étapes du tour en cours : ComprehensionTexte seulement au tour 1
  const etapesDuTour = tour === 1
    ? etapesRepetees
    : etapesRepetees.filter(e => e !== "ComprehensionTexte");

  // Étapes finales, une seule fois, après les 2 tours
  const etapesFinales = [
    "TestBarrage",
    "TestBarrage2",
    "StrategiesEtude"
  ];

  const terminerSeance = () => {
    const dureeSecondes = (Date.now() - debutSeance.current) / 1000;

    fetch(`${API_URL}/api/saveDuree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            participant,
            seance: isInBase === 1 ? "finale" : "repetee",
            duree_secondes: dureeSecondes,
        }),
    }).catch((err) => console.error(err));

    setEtapeGlobal("Fin");
  };

  const passerEtapeSuivante = () => {
    console.log("etape:", etapeGlobal, "tour:", tour);
    // Cas 0 : étape initiale
    if (etapeGlobal === "Bienvenue") {
      debutSeance.current = Date.now(); //demarre le chrono
      console.log("debutSeance.current =", debutSeance.current);
      setEtapeGlobal(isInBase === 1 ? etapesFinales[0] : etapesRepetees[0]);
      return;
    }
// Cas 1 : on est dans la boucle répétée
const indexRepetee = etapesDuTour.indexOf(etapeGlobal);
if (indexRepetee !== -1) {
  if (indexRepetee < etapesDuTour.length - 1) {
    // il reste une étape dans ce tour : on passe à la suivante
    setEtapeGlobal(etapesDuTour[indexRepetee + 1]);
  } else if (tour === 1) {
    // fin du 1er passage → on repart au début avec tour = 2
    setTour(2);
    setEtapeGlobal(etapesRepetees[0]);
  } else {
    // fin du 2e passage
    terminerSeance();
  }
  return;
}

    // Cas 2 : on est dans les étapes finales (non répétées)
    const indexFinale = etapesFinales.indexOf(etapeGlobal);
    if (indexFinale !== -1) {
      if (indexFinale < etapesFinales.length - 1) {
        setEtapeGlobal(etapesFinales[indexFinale + 1]);
      } else {
        terminerSeance();
      }
    }
  };

  return (
    <div style={{ /* ... */ }}>
      {etapeGlobal === "CheckEmail" && (
        <CheckEmail onComplete={passerEtapeSuivante} />
      )}

      {etapeGlobal === "Bienvenue" && (
        <Bienvenue onComplete={passerEtapeSuivante} setParticipant={setParticipant} setIsDys={setIsDys}/>
      )}

      {etapeGlobal === "Similitudes" && (
        <Similitudes participant={participant} onComplete={passerEtapeSuivante} tour={tour} isDys={isDys}/>
      )}

      {etapeGlobal === "Vocabulaire" && (
        <Vocabulaire participant={participant} onComplete={passerEtapeSuivante} tour={tour} isDys={isDys}/>
      )}

      {etapeGlobal === "Comprehension" && (
        <Comprehension participant={participant} onComplete={passerEtapeSuivante} tour={tour} isDys={isDys}/>
      )}

      {/*{etapeGlobal === "Dictee" && (
        <Dictee onComplete={passerEtapeSuivante} tour={tour} />
      )}*/}

      {etapeGlobal === "ComprehensionTexte" && (
        <ComprehensionTexte participant={participant} onComplete={passerEtapeSuivante} tour={tour} isDys={isDys}/>
      )}

      {/* Ces trois-là n'ont PAS besoin de tour, car jamais répétées */}
      {etapeGlobal === "TestBarrage" && (
        <TestBarrage participant={participant} onComplete={passerEtapeSuivante} isDys={isDys}/>
      )}

      {etapeGlobal === "TestBarrage2" && (
        <TestBarrage2 participant={participant} onComplete={passerEtapeSuivante} isDys={isDys}/>
      )}

      {etapeGlobal === "StrategiesEtude" && (
        <StrategiesEtude participant={participant} onComplete={passerEtapeSuivante} isDys={isDys}/>
      )}

      {etapeGlobal === "Fin" && (
          <h2 style={{ fontSize: 40 }}>
              Grazie! Per oggi hai finito. Puoi chiudere la pagina.
          </h2>
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
    width: "auto"
};