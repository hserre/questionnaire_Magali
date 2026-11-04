import React, { useEffect, useState } from "react";
import { styleBoutonContinuer } from "./InterfaceUtils";

// ---------- Réglages ----------
const LARGEUR_PAYSAGE = 0.8;   // largeur max du tableau en mode paysage (80 % de la fenêtre)
const LARGEUR_PORTRAIT = 0.96; // largeur max du tableau en mode portrait
const PART_TEXTE_MIN = 0.4;    // la colonne des phrases garde au moins 40 % de la largeur du tableau
const RESERVE_VERTICALE = 170; // hauteur (px) laissée au bandeau du haut, au bouton et aux marges
const COTE_MIN = 28;           // taille mini d'une case (px)
const COTE_MAX = 90;           // taille maxi d'une case (px)
const POLICE_MIN = 13;         // taille mini du texte (px)
const POLICE_MAX = 20;         // taille maxi du texte (px)

// Suit la taille de la fenêtre (se met à jour quand on la redimensionne)
function useTailleFenetre() {
    const lire = () => ({
        w: document.documentElement.clientWidth, // sans la barre de défilement
        h: window.innerHeight,
    });

    const [taille, setTaille] = useState(lire);

    useEffect(() => {
        const maj = () => setTaille(lire());
        window.addEventListener("resize", maj);
        return () => window.removeEventListener("resize", maj);
    }, []);

    return taille;
}

// Calcule la largeur du tableau, le côté des cases (carrées) et la taille du texte.
// Le côté d'une case est le plus petit des deux côtés permis par :
//  - la hauteur : toutes les lignes (+ l'en-tête) doivent tenir dans la fenêtre ;
//  - la largeur : la colonne des phrases doit rester assez large (2 lignes de texte).
function calculerDimensions(w, h, nbEchelle, nbItems) {
    const paysage = w > h;
    const largeurTableau = Math.round(
        (paysage ? LARGEUR_PAYSAGE : LARGEUR_PORTRAIT) * w
    );

    const coteHauteur = (h - RESERVE_VERTICALE) / (nbItems + 1);
    const coteLargeur = (largeurTableau * (1 - PART_TEXTE_MIN)) / nbEchelle;

    const cote = Math.round(
        Math.max(COTE_MIN, Math.min(coteHauteur, coteLargeur, COTE_MAX))
    );
    const police = Math.round(
        Math.max(POLICE_MIN, Math.min(POLICE_MAX, cote * 0.27))
    );

    return { largeurTableau, cote, police };
}

// Tableau de questions avec échelle de réponse (cases carrées), titre et bouton de validation.
//   items       : les phrases à évaluer
//   nbEchelle   : nombre de colonnes de réponse (7 ou 5)
//   reponses    : { indexLigne: valeur } (état tenu par le composant parent)
//   onChoisir   : (indexLigne, valeur) => void
//   onNext      : appelé au clic sur "Conferma" (visible quand tout est rempli)
export default function TableauEchelle({
    titre,
    items,
    nbEchelle,
    reponses,
    onChoisir,
    onNext,
}) {
    const { w, h } = useTailleFenetre();
    const { largeurTableau, cote, police } = calculerDimensions(
        w,
        h,
        nbEchelle,
        items.length
    );

    const valeurs = Array.from({ length: nbEchelle }, (_, i) => i + 1);
    const boutonVisible = Object.keys(reponses).length === items.length;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: "calc(100svh - var(--h-bandeau, 0px))",
            }}
        >
            <table
                style={{
                    borderCollapse: "collapse",
                    width: largeurTableau,
                    margin: "0 auto",
                    textAlign: "left",
                    tableLayout: "fixed",
                    fontSize: police,
                }}
            >
                <colgroup>
                    <col /> {/* colonne des phrases : prend tout le reste */}
                    {valeurs.map((n) => (
                        <col key={n} style={{ width: cote }} />
                    ))}
                </colgroup>

                <thead>
                    <tr>
                        <th
                            style={{
                                border: "1px solid black",
                                padding: "4px 10px",
                                lineHeight: 1.3,
                                boxSizing: "border-box",
                            }}
                        >
                            {titre}
                        </th>

                        {valeurs.map((n) => (
                            <th
                                key={n}
                                style={{
                                    border: "1px solid black",
                                    padding: "4px 0",
                                    textAlign: "center",
                                    boxSizing: "border-box",
                                }}
                            >
                                {n}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} style={{ height: cote }}>
                            <td
                                title={item} // affiche la phrase entière au survol
                                style={{
                                    border: "1px solid black",
                                    padding: "4px 10px",
                                    lineHeight: 1.3,
                                    height: cote,
                                    boxSizing: "border-box",
                                    verticalAlign: "middle",
                                }}
                            >
                                {item}
                            </td>

                            {valeurs.map((valeur) => {
                                const choisie = reponses[index] === valeur;
                                return (
                                    <td
                                        key={valeur}
                                        onClick={() => onChoisir(index, valeur)}
                                        style={{
                                            border: "1px solid black",
                                            padding: 0,
                                            width: cote,
                                            height: cote,
                                            boxSizing: "border-box",
                                            textAlign: "center",
                                            verticalAlign: "middle",
                                            cursor: "pointer",
                                            userSelect: "none",
                                            fontSize: Math.round(cote * 0.5),
                                            backgroundColor: choisie
                                                ? "#8e44ad"
                                                : "rgb(244, 228, 245)",
                                            color: choisie ? "white" : "black",
                                        }}
                                    >
                                        {choisie ? "✓" : ""}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            <button
                onClick={onNext}
                disabled={!boutonVisible}
                tabIndex={boutonVisible ? 0 : -1}
                aria-hidden={!boutonVisible}
                style={{
                    ...styleBoutonContinuer,
                    visibility: boutonVisible ? "visible" : "hidden",
                }}
            >
                Conferma
            </button>
        </div>
    );
}
