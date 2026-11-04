import React, { useEffect, useState, useRef } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import { API_URL } from "../config";
import {
    ligne,
    enregistrerLignes,
    enregistrerDureeTotale,
    suffixeLangue,
} from "./sauvegarde";

const estEssai = (item) =>
    item?.partie === "test" || item?.partie === "entrainement";

// Durée de réponse (en secondes) pour chaque question d'entraînement / de test.
// Cette valeur sert à la fois pour le décompte et pour le texte {temps} des instructions.
// Temps de réponse par question (s) : 30 s si DSA ou ADHD déclaré (isDys = 1), 25 s sinon
const DUREE_NORMALE = 25;
const DUREE_DYS = 30;

// Lignes de l'Excel qui ne sont pas des écrans d'essai :
// le "titre" fournit les instructions de départ, la vidéo remplace les exemples.
const PARTIES_HORS_LISTE = ["titre", "video", "presentation", "exemple"];

// Parties dont l'ordre est tiré au sort
const PARTIES_MELANGEES = ["entrainement", "test"];

function melanger(tableau) {
    const copie = [...tableau];

    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }

    return copie;
}

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

    const intro = lignes.find((item) => item.partie === "titre")?.instructions ?? "";
    const essais = lignes.filter((item) => !PARTIES_HORS_LISTE.includes(item.partie));

    return { intro, essais: melangerBlocs(essais) };
}

export default function Similitudes({ participant, isDys, onComplete, tour }) {
    // 1 = instructions, 2 = vidéo d'exemple (tour 1 seulement), 3 = essais
    const [sousPage, setSousPage] = useState(1);
    const [intro, setIntro] = useState("");
    const [mots, setMots] = useState([]);
    const [indexEssai, setIndexEssai] = useState(0);

    const [texte, setTexte] = useState("");
    const [tempsEcoule, setTempsEcoule] = useState(false);

    const debutEssai = useRef(Date.now());
    // Début de l'épreuve = affichage du premier essai (entraînement ou test)
    const debutEpreuve = useRef(null);
    const videoRef = useRef(null);

    const EPREUVE = `Similitudes_${suffixeLangue(tour)}`;

    const dureeSec = isDys === 0 ? DUREE_NORMALE : DUREE_DYS;

    const essai = mots[indexEssai];
    const enEssai = estEssai(essai);

    const saveData = (essai, reponse) => {
        const maintenant = Date.now();
        // Temps de réponse en ms, plafonné à la durée autorisée
        const temps = Math.min(maintenant - debutEssai.current, dureeSec * 1000);

        // Rang de présentation de la question dans sa partie (entraînement ou test)
        const position = mots
            .slice(0, indexEssai + 1)
            .filter((m) => m.partie === essai.partie).length;

        // Dernier essai de l'épreuve : on calcule la durée totale
        const dernier = !mots.slice(indexEssai + 1).some(estEssai);
        const dureeTotale = dernier ? maintenant - debutEpreuve.current : null;

        enregistrerLignes([
            ligne({
                participant,
                epreuve: EPREUVE,
                partie: essai.partie,
                question: essai.question,
                reponse,
                duree_reponse: temps,
                position_question: position,
                duree_totale_epreuve: dureeTotale,
            }),
        ]).then(() => {
            if (dernier) enregistrerDureeTotale(participant, EPREUVE, dureeTotale);
        });
    };

    const continuer = () => {
        // Enregistre la réponse (entraînements et tests), même vide si le temps est écoulé
        if (enEssai) saveData(essai, texte);

        // Dernier élément de la liste : fin de l'activité
        if (indexEssai >= mots.length - 1) {
            onComplete();
            return;
        }

        setTexte("");
        setTempsEcoule(false);
        setIndexEssai((prev) => prev + 1);
    };

    // Chargement des stimuli (l'ordre aléatoire est tiré une seule fois)
    useEffect(() => {
        fetch(`${API_URL}/api/stimuli/Similitudes?tour=${tour}`)
            .then((res) => res.json())
            .then((data) => {
                const { intro, essais } = preparerEssais(data);
                setIntro(intro);
                setMots(essais);
            })
            .catch((err) => console.error(err));
    }, []);

    // Décompte : démarre à chaque question d'entraînement / de test affichée
    useEffect(() => {
        if (sousPage !== 3 || !enEssai) return;

        setTempsEcoule(false);
        debutEssai.current = Date.now();
        if (debutEpreuve.current === null) debutEpreuve.current = debutEssai.current;

        const timer = setTimeout(() => setTempsEcoule(true), dureeSec * 1000);
        return () => clearTimeout(timer);
    }, [sousPage, indexEssai, enEssai, dureeSec]);

    // Temps écoulé : "Tempo scaduto" reste affiché 1 s, puis on passe à la suite
    useEffect(() => {
        if (!tempsEcoule) return;

        const timeout = setTimeout(continuer, 1000);
        return () => clearTimeout(timeout);
    }, [tempsEcoule]);

    if (!essai) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                Chargement...
            </div>
        );
    }

    const messageTemps = "Tempo scaduto";

    const boutonTransitionVisible = essai.partie === "transition";
    const boutonTestVisible = enEssai && texte !== "" && !tempsEcoule;
    const boutonVisible = boutonTransitionVisible || boutonTestVisible;

    const texteDeb = intro.replace("{temps}", String(dureeSec));

    if (sousPage === 1) {
        return (
            <div className="instructions">
                <h2 dangerouslySetInnerHTML={{ __html: texteDeb }} />

                <BoutonAudio fichier={Number(tour) !== 1 ? "consignes_similitudes_fr.mp3" : isDys === 1 ? "consignes_similitudes_IT_DSA.mp3" : "consignes_similitudes_IT.mp3"} />
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
                    Avvia il video e guarda i due esempi. Se necessario, puoi
                    rivederlo. Dopodiché toccherà a te.
                </h2>
                <video
                    style={{ border: "1px solid black" }}
                    ref={videoRef}
                    src="/videos/exemple_similitudes.mov"
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

    return (
        <div className="instructions">
            {/* Question */}
            {essai.partie === "transition" ? (
                <h2 style={{ marginBottom: "5svh" }}>{essai.instructions}</h2>
            ) : enEssai && tempsEcoule ? (
                <h1 style={{ marginBottom: "5svh" }}>{messageTemps}</h1>
            ) : (
                <h2 style={{ marginBottom: "5svh" }}>{essai.question}</h2>
            )}

            {/* Réponse */}
            {enEssai && !tempsEcoule && (
                <input
                    key={indexEssai}
                    className="champ-texte"
                    type="text"
                    autoFocus
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    placeholder=""
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={{
                        height: "5vh",
                        fontSize: "3vh",
                        width: "35vw",
                        justifyContent: "center",
                        textAlign: "center",
                        marginBottom: "5svh",
                    }}
                />
            )}

            <button
                style={{
                    ...styleBoutonContinuer,
                    margin: "2svh auto 0 auto",
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
