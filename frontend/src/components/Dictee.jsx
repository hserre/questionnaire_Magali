import React, { useEffect, useState,useRef } from "react";
import {styleBoutonContinuer } from "./InterfaceUtils"; // Votre fichier contenant les composants de la croix
import { API_URL } from "../config";

export default function ComprehensionTexte({onComplete}) {
  const [texte, setTexte] = useState(`
    La méson est enfin silencieuse. Les enfants dorme.
    Leur respirations légères se mêlent au bruit lointain de la ville.
    Myriam s'assois sur le canapé du salon. Elle ferme les yeux et prend une longue inspiration.
    La journé à été longue, fatigante et pleine de bruits.
    Partout, il y a des jouets qui traînent, des livres ouverts et des tases vides.
    Mai maintenant, c'est le calme. Le tenps semble s'arrêter.
    Elle savoure cette instant unique ou personne ne demande rien,
    où aucunes voix ne l'appelle. Elle est seul avec elle-même,
    dans la paix de cette nui qui comence.
  `);
    const DURATION = 600;
    const [timeLeft, setTimeLeft] = useState(DURATION);
    const [finished, setFinished] = useState(false);
    const [timeUp, setTimeUp] = useState(false);
    const [tempsDebut, setTempsDebut] = useState(Date.now());

    useEffect(() => {
    setTimeLeft(DURATION);
    }, [page]);

      useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    }, [finished,page]);


    useEffect(() => {
    setTempsDebut(Date.now());
    },[page]);

    useEffect(() => {
    if (timeUp && page !== 4 && page !== 5) {
        const timeout = setTimeout(() => {
        setPage((p) => p + 1);
        setTimeUp(false);
        }, 1000);

        return () => clearTimeout(timeout);
    }
    }, [timeUp, page]);


  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        minHeight: "250px",
        backgroundColor: "#fff",
        overflowY: "auto",
      }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: texte }}
        onInput={(e) => setTexte(e.currentTarget.innerHTML)}
      />
    <button
        onClick={() => {onComplete;
            //const temps = (Date.now() - tempsDebut) / 1000;
            //console.log("Temps :", temps, "s");
            //saveData(responses, temps);
            onComplete();
        }}
        style={styleBoutonContinuer}
    >
        Valider
    </button>
    </div>

  );
}