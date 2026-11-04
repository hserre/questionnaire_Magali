import React, { useEffect, useState, useRef } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import { API_URL } from "../config";
import {
    ligne,
    enregistrerLignes,
    enregistrerDureeTotale,
    suffixeLangue,
    chrono,
} from "./sauvegarde";

const estEssai = (item) =>
    item?.partie === "test" || item?.partie === "entrainement";

function melanger(tableau) {
    const copie = [...tableau];

    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }

    return copie;
}

// Lignes de l'Excel qui ne sont pas des écrans d'essai :
// le "titre" fournit les instructions de départ, la vidéo remplace les exemples.
const PARTIES_HORS_LISTE = ["titre", "video", "presentation", "exemple"];

// Parties dont l'ordre est tiré au sort
const PARTIES_MELANGEES = ["entrainement", "test"];

// Mélange chaque bloc de lignes consécutives de même partie (entraînements, tests)
// et laisse tout le reste à sa place : l'ordre écrit dans l'Excel est respecté
// (transition, entraînements, transition, tests, fin), quel que soit le nombre
// de transitions que contient le fichier.
function melangerBlocs(lignes) {
    const resultat = [];
    let i = 0;

    while (i < lignes.length) {
        const partie = lignes[i].partie;
        let j = i;
        while (j < lignes.length && lignes[j].partie === partie) j++;

        const bloc = lignes.slice(i, j);
        resultat.push(...(PARTIES_MELANGEES.includes(partie) ? melanger(bloc) : bloc));
        i = j;
    }

    return resultat;
}

function preparerEssais(data) {
    // On ignore les lignes vides éventuelles
    const lignes = data.filter((item) => item && item.partie);

    const intro =
        lignes.find((item) => item.partie === "titre")?.instructions ??
        lignes[0]?.instructions ??
        "";
    const essais = lignes.filter((item) => !PARTIES_HORS_LISTE.includes(item.partie));

    return { intro, essais: melangerBlocs(essais) };
}

const styleCase = { width: "24px", height: "24px", cursor: "pointer" };

export default function Vocabulaire({ participant, onComplete, tour }) {
    // 1 = instructions, 2 = vidéo d'exemple (tour 1 seulement), 3 = essais
    const [sousPage, setSousPage] = useState(1);
    const [intro, setIntro] = useState("");
    const [mots, setMots] = useState([]);
    const [indexEssai, setIndexEssai] = useState(0);
    const [choixSelectionne, setChoixSelectionne] = useState(null);
    const [tempsDebut, setTempsDebut] = useState(Date.now());
    const [tempsReaction, setTempsReaction] = useState(0);
    const [position, setPosition] = useState(0);
    const [showButton, setShowButton] = useState(false);
    const [delai, setDelai] = useState(3000);

    const videoRef = useRef(null);
    // Début de l'épreuve = affichage du premier essai (entraînement ou test)
    const debutEpreuve = useRef(null);

    const EPREUVE = `Vocabulaire_${suffixeLangue(tour)}`;

    useEffect(() => {
        setShowButton(false);

        const timer = setTimeout(() => {
            setShowButton(true);
        }, delai);

        return () => clearTimeout(timer);
    }, [indexEssai]);

    useEffect(() => {
        const chargerStimuli = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/stimuli/Vocabulaire?tour=${tour}`
                );

                const data = JSON.parse(await response.text());

                const { intro, essais } = preparerEssais(data);
                setIntro(intro);
                setMots(essais);
            } catch (error) {
                console.error("ERREUR COMPLETE :", error);
                console.error(error.stack);
            }
        };

        chargerStimuli();
    }, []);

    // Chrono relancé à chaque écran (et au passage consignes/vidéo -> essais)
    useEffect(() => {
        const maintenant = Date.now();
        setTempsDebut(maintenant);
        if (
            sousPage === 3 &&
            debutEpreuve.current === null &&
            estEssai(mots[indexEssai])
        ) {
            debutEpreuve.current = maintenant;
        }
    }, [indexEssai, sousPage, mots]);

    if (mots.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                Chargement...
            </div>
        );
    }

    const essai = mots[indexEssai];
    if (!essai) return null;

    const boutonTransitionVisible = essai.partie === "transition";
    const boutonTestVisible =
        (essai.partie === "test" || essai.partie === "entrainement") &&
        choixSelectionne;
    const boutonVisible = boutonTransitionVisible || boutonTestVisible;

    const saveData = (essai, choixSelectionne, tempsReaction) => {
        const maintenant = Date.now();

        // Rang de présentation de la question dans sa partie (entraînement ou test)
        const position = mots
            .slice(0, indexEssai + 1)
            .filter((m) => m.partie === essai.partie).length;

        // Position (1 à 3) de la bonne réponse parmi les options affichées
        const indexBonne = [essai.option1, essai.option2, essai.option3].findIndex(
            (o) => String(o) === String(essai.reponse)
        );

        // Dernier essai de l'épreuve : on calcule la durée totale
        const dernier = !mots.slice(indexEssai + 1).some(estEssai);
        const dureeTotale = dernier ? maintenant - debutEpreuve.current : null;

        enregistrerLignes([
            ligne({
                participant,
                epreuve: EPREUVE,
                partie: essai.partie,
                question: essai.question,
                reponse: choixSelectionne,
                duree_reponse: tempsReaction,
                time_stamp: chrono(tempsDebut + tempsReaction),
                position_question: position,
                position_bonne_reponse: indexBonne >= 0 ? indexBonne + 1 : null,
                duree_totale_epreuve: dureeTotale,
            }),
        ]).then(() => {
            if (dernier) enregistrerDureeTotale(participant, EPREUVE, dureeTotale);
        });
    };

    const continuer = () => {
        // Enregistre la réponse (entraînements et tests seulement)
        if (essai.partie === "entrainement" || essai.partie === "test") {
            saveData(essai, choixSelectionne, tempsReaction);
        }

        // Dernier élément de la liste : fin de l'activité
        if (indexEssai >= mots.length - 1) {
            onComplete();
            return;
        }
        setChoixSelectionne(null);
        setIndexEssai((prev) => prev + 1);
    };

    if (sousPage === 1) {
        return (
            <div className="instructions">
                <h2 dangerouslySetInnerHTML={{ __html: intro }} />

                <BoutonAudio fichier={Number(tour) === 1 ? "consignes_vocabulaire_IT.mp3" : "consignes_vocabulaire_fr.mp3"} />
                <button
                    onClick={() => setSousPage(tour === 1 ? 2 : 3)}
                    style={styleBoutonContinuer}
                >
                    Inizia
                </button>
            </div>
        );
    }

    if (sousPage === 2) {
        return (
            <div className="instructions">
                <h2 style={{ marginBottom: "3svh" }}>
                    Avvia il video e guarda l'esempio. Se necessario, puoi
                    rivederlo. Dopodiché toccherà a te.
                </h2>
                <video
                    style={{ border: "1px solid black" }}
                    ref={videoRef}
                    src="/videos/exemple_vocabulaire.mov"
                    width="900"
                    playsInline
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                />

                <button
                    onClick={() => setSousPage(3)}
                    style={styleBoutonContinuer}
                >
                    Continua
                </button>
            </div>
        );
    }

    if (essai.partie === "fin") {
        return (
            <div className="instructions">
                <h2>{essai.instructions}</h2>

                <button onClick={onComplete} style={styleBoutonContinuer}>
                    Continua
                </button>
            </div>
        );
    }

    const options = [essai.option1, essai.option2, essai.option3];

    return (
        <div
            style={{
                // hauteur visible sous le bandeau d'étapes : le bloc est centré verticalement
                minHeight: "calc(100svh - var(--h-bandeau))",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Question (ou texte de transition) */}
            <h2>
                {essai.partie === "transition"
                    ? essai.instructions
                    : essai.question}
            </h2>

            {/* Réponses */}
            {essai.partie !== "transition" && (
                <div
                    style={{
                        width: "fit-content",
                        margin: "2svh auto 0 auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3svh",
                    }}
                >
                    {options.map((option, i) => (
                        <label
                            key={`${indexEssai}-${i}`}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "30px 1fr",
                                columnGap: "10px",
                                alignItems: "center",
                                fontSize: "24px",
                                textAlign: "left",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="radio"
                                style={styleCase}
                                name="question"
                                value={option}
                                checked={choixSelectionne === option}
                                onChange={() => {
                                    setTempsReaction(Date.now() - tempsDebut);
                                    // la valeur d'origine (et non e.target.value, toujours du texte)
                                    setChoixSelectionne(option);
                                    setPosition(i + 1);
                                }}
                            />
                            <span style={{ lineHeight: "1.3" }}>{option}</span>
                        </label>
                    ))}
                </div>
            )}

            <button
                style={{
                    ...styleBoutonContinuer,
                    margin: "6svh auto 0 auto",
                    visibility: boutonVisible ? "visible" : "hidden",
                }}
                onClick={continuer}
                disabled={!boutonVisible}
                tabIndex={boutonVisible ? 0 : -1}
                aria-hidden={!boutonVisible}
            >
                {essai.partie === "transition" ? "Continua" : "Conferma"}
            </button>
        </div>
    );
}
