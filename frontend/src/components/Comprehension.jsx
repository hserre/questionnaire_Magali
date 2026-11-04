import React, { useEffect, useState, useRef } from "react";
import BoutonAudio from "./BoutonAudio";
import {styleBoutonContinuer } from "./InterfaceUtils"; // Votre fichier contenant les composants de la croix
import { API_URL } from "../config";
import { ligne, enregistrerLignes, suffixeLangue, chrono } from "./sauvegarde";


function melanger(tableau) {
    const copie = [...tableau];

    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }

    return copie;
}

function melangerParCategories(data) {
   // const exemples = melanger(
   //      data.filter(item => item.partie === "exemple")
   //  );

  //   const entrainements = melanger(
  //       data.filter(item => item.partie === "entrainement")
  //   );

    const tests = melanger(
        data.filter(item => item.partie === "test")
    );

 //    const transitions = data.filter(
  //       item => item.partie === "transition"
 //    );

    return [
     //    ...exemples,
     //    transitions[0],
     //    ...entrainements,
     //    transitions[1],
        ...tests
    ];
}


export default function Compréhension({ participant, onComplete,tour }) {

    const [sousPage, setSousPage] = useState(1);
    const [mots, setMots] = useState([]);
    const [instructions, setInstructions] = useState([]);
    const [choixSelectionne, setChoixSelectionne] = useState("");
    const [reponses, setReponses] = useState([]);
    const [Endo, setEndo] = useState(false);
    const [associations, setAssociations] = useState({});

    const toutesReponsesPlacees = Object.keys(associations).length === mots.length;

    const videoRef = useRef(null);
    const [origines, setOrigines] = useState({});

    const EPREUVE = `Comprehension_${suffixeLangue(tour)}`;

    // La grille est affichée en sous-page 4, ou dès la sous-page 3 hors tour 1 (pas de vidéo)
    const enGrille = sousPage === 4 || (sousPage === 3 && Number(tour) !== 1);

    // Début de l'épreuve = affichage de la grille
    const debutGrille = useRef(Date.now());

    useEffect(() => {
        if (enGrille) {
            debutGrille.current = Date.now();
        }
    }, [enGrille]);

    const jouerVideo = () => {
        videoRef.current?.play().catch(err => console.error("Lecture bloquée :", err));
    };


function handleDrop(e, questionId) {
    const reponseDeposee = e.dataTransfer.getData("text");
    const indexStr = e.dataTransfer.getData("index");

    // Rien à déposer (ex. glisser depuis une zone de dépôt)
    if (indexStr === "") return;
    const indexOrigine = Number(indexStr);

    if (associations[questionId]) {
        return;
    }

    setAssociations(prev => ({
        ...prev,
        [questionId]: reponseDeposee
    }));

    // On retient d'où vient la réponse pour pouvoir la remettre à sa place
    setOrigines(prev => ({ ...prev, [questionId]: indexOrigine }));

    // On vide la case au lieu de la supprimer : les autres ne bougent pas
    setReponses(prev =>
        prev.map((r, i) => (i === indexOrigine ? null : r))
    );
}

function handleDragFromDropZone(reponse, questionId) {
    const indexOrigine = origines[questionId];

    // Supprime l'association
    setAssociations(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
    });

    setOrigines(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
    });

    // Remet la réponse dans sa case d'origine, à droite
    setReponses(prev =>
        prev.map((r, i) => (i === indexOrigine ? reponse : r))
    );
}

    useEffect(() => {
        fetch(`${API_URL}/api/stimuli/Comprehension?tour=${tour}`)
            .then((res) => res.json())
            .then((data) => {
                setInstructions([data.at(0),data.at(1),data.at(-1)]);
                setMots(melangerParCategories(data));
                const nouveauTab = data.slice(5, -1);
                setReponses(melanger(nouveauTab.map(x => x.reponse)));
            })
            .catch((err) => console.error(err));
    }, []);


    if (mots.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                Chargement...
            </div>
        );
    }

    const questions = mots.map(x => x.question);
    const parties = mots.map(x => x.partie);
    const bonneReponses = mots.map(x => x.reponse);
    const l = mots.length;

    const boutonTestVisible = toutesReponsesPlacees;

    // Une ligne par question ; toutes les réponses sont validées en même temps,
    // donc la durée totale est connue dès l'envoi
    const saveData = (l, questions, associations, parties, tempsReaction) => {
        const lignes = [];
        for (let i = 0; i < l; i++) {
            lignes.push(
                ligne({
                    participant,
                    epreuve: EPREUVE,
                    partie: parties[i],
                    question: questions[i],
                    reponse: associations[i] ?? null,
                    // Les réponses peuvent être déplacées jusqu'à la validation :
                    // durée et moment sont ceux du clic sur "Conferma", pour toutes les questions
                    duree_reponse: tempsReaction,
                    time_stamp: chrono(),
                    duree_totale_epreuve: tempsReaction,
                })
            );
        }
        enregistrerLignes(lignes);
    };

    if (sousPage === 1) {
    return (
        <div className="instructions">
            <h2 dangerouslySetInnerHTML={{ __html: instructions[0].question }} />

            <BoutonAudio fichier={Number(tour) === 1 ? "consignes_comprehension_IT.mp3" : "consignes_comprehension_FR.mp3"} />
            <button
                onClick={() => {setSousPage(3);
                  }
                }
                style={styleBoutonContinuer}
            >
                Inizia
            </button>
        </div>
    );
}

/*    if (sousPage === 2) {
        return (
            <div className="instructions">
            <h2 dangerouslySetInnerHTML={{ __html: instructions[1].question }} />


                <button
                    onClick={() => {setSousPage(tour === 1 ? 3 : 4);
                        }
                    }
                    style={styleBoutonContinuer}
                >
                    Continua
                </button>
            </div>
        );
    } */

       if (sousPage === 3 & tour==1) {
        return (
        <div className="instructions">
            <h2 style={{marginBottom:'3svh'}}>Avvia il video e guarda l'esempio. Se necessario, puoi rivederlo. Dopodiché toccherà a te.</h2>
            <video style={{border: "1px solid black"}}
                ref={videoRef}
                src="/videos/exemple_comprehension.mov"
                width="900"
                playsInline
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
            />
    
                {/*<button onClick={jouerVideo} style={{fontSize:"3svh", margin: "3svh" }}>
                   avvia il video
                </button>*/}
    
                <button
                    onClick={() => {setSousPage(4);}
                    }
                    style={styleBoutonContinuer}
                >
                    Continua
                </button>
            </div>
        );
    }
    

    if (sousPage===5) {
        return (
            <>
            <div className="instructions">
                <h2>{instructions[2].question}</h2>

                <button onClick={onComplete} style={styleBoutonContinuer}>
                    Continua
                </button>
            </div>
            </>
        );
    }

    
    return (
        <div
style={{
minHeight: "100vh",
display: "flex",
flexDirection: "column",
justifyContent: "center",
alignItems: "center",
}}
>
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            width: "80svw",            
        }}>
            {/* Questions */}
            <div>
                {questions.map((q, index) => (
                    <div key={index}
                    style={{fontSize:'2svh',
                            lineHeight:'1.3',
                            border: "1px solid black",
                            minHeight: "10svh",
                            marginBottom: "0px",
                            display:"flex",
                            justifyContent:"center",
                            alignItems:"center",
                            textAlign:"center",
                            padding:'0 1svh'
                        }}
                        >{q}</div>
                ))}
            </div>

            {/* Zones de dépôt */}
            <div>
                {questions.map((q, index) => (
                    <div
                        key={index}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, index)}
                        style={{
                            fontSize: '2svh', 
                            border: "1px solid black",
                            minHeight: "10svh",
                            marginBottom: "0px",
                            display:"flex",
                            justifyContent:"center",
                            alignItems:"center",
                            textAlign:"center",
                            padding:'0 1svh'
                        }}
                    >
                        {associations[index] && (
                            <div
                                draggable
                                onDragStart={() =>
                                    handleDragFromDropZone(
                                        associations[index],
                                        index
                                    )
                                }
                                style={{
                                    cursor: "grab",
                                    height: "100%"
                                }}
                            >
                                {associations[index]}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Réponses */}
            <div>
                {reponses.map((r, index) =>
                    r === null ? (
                        // Case vide : garde la place pour que les autres ne remontent pas
                        <div
                            key={`vide-${index}`}
                            style={{
                                border: "1px solid transparent",
                                minHeight: "10svh",
                                marginBottom: "0px",
                                padding:'0 1svh'
                            }}
                        />
                    ) : (
                        <div
                            key={`${r}-${index}`}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData("text", r);
                                e.dataTransfer.setData("index", String(index));
                            }}
                            style={{
                                fontSize: '2svh',
                                border: "1px solid gray",
                                minHeight: "10svh",
                                marginBottom: "0px",
                                cursor: "grab",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                textAlign: "center",
                                padding:'0 1svh'

                            }}
                        >
                            {r}
                        </div>
                    )
                )}
            </div>
            </div>

        <button
            style={{
                ...styleBoutonContinuer,
                visibility: boutonTestVisible ? "visible" : "hidden",
            }}
            onClick={() => {
                setEndo(true);
                const tempsReaction = Date.now() - debutGrille.current;
                saveData(l, questions, associations, parties, tempsReaction);
                setSousPage(5);
            }}
            disabled={!boutonTestVisible}
            tabIndex={boutonTestVisible ? 0 : -1}
            aria-hidden={!boutonTestVisible}
            >
            Conferma
        </button>   
        </div>
    );
}

//               for (let i = 0; i < mots.length; i++){
//        console.log(parties[i])
//       console.log(questions[i])
//        console.log(associations[i])
//       console.log(associations[i] === bonneReponses[i] ? 1 : 0)
//       console.log(tempsReaction)
//}
