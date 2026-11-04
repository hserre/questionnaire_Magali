import React, { useState, useEffect, useRef } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import "./TestBarrage.css";
import { ligne, enregistrerLignes, chrono } from "./sauvegarde";

const EPREUVE = "Barrage2";

// Couleurs réelles des formes
const COLORS = {
  red: "#d64a3b",
  blue: "#69a9dc",
};

// Tailles des formes
const SIZE_EXEMPLE = "6vh";   // grille d'exemple (7 colonnes)
const SIZE_TEST = "6vh";      // grille du test (18 colonnes)
const SIZE_LEGENDE = "6vh";   // formes affichées au-dessus des grilles
const SIZE_INLINE = "6vh";    // formes dans la phrase de consigne

// Étoile à 5 branches dans un repère 100 x 100
const STAR_POINTS =
  "50,5 61.2,36.6 94.7,37.5 68.1,57.9 77.6,90 50,71 22.4,90 31.9,57.9 5.3,37.5 38.8,36.6";

// Forme dessinée en SVG : la bordure noire suit exactement le contour
function Shape({ type, color, size, inline = false }) {
  const fill = COLORS[color];
  const common = {
    fill,
    stroke: "black",
    strokeWidth: 1,
    vectorEffect: "non-scaling-stroke",
  };

  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: size,
        height: size,
        display: inline ? "inline-block" : "block",
        verticalAlign: inline ? "middle" : undefined,
      }}
    >
      {type === "star" ? (
        <polygon points={STAR_POINTS} {...common} />
      ) : (
        <circle cx="50" cy="50" r="35" {...common} />
      )}
    </svg>
  );
}

const F = {
  CR: { type: "circle", color: "red" },
  CB: { type: "circle", color: "blue" },
  ER: { type: "star", color: "red" },
  EB: { type: "star", color: "blue" },
};

const FIXED_GRID = [
  F.CR,F.EB,F.CR,F.EB,F.CR,F.ER,F.CR,F.EB,F.CR,F.EB,F.EB,F.CR,F.ER,F.EB,F.CB,F.EB,F.CR,F.EB,
  F.CB,F.EB,F.ER,F.EB,F.EB,F.CR,F.EB,F.CB,F.EB,F.ER,F.CR,F.EB,F.CR,F.EB,F.CR,F.EB,F.CR,F.CR,
  F.EB,F.CR,F.EB,F.EB,F.CB,F.EB,F.CR,F.ER,F.EB,F.CR,F.EB,F.CR,F.ER,F.CR,F.CR,F.EB,F.EB,F.CB,
  F.EB,F.CB,F.CR,F.ER,F.EB,F.CR,F.CR,F.EB,F.EB,F.EB,F.CR,F.CB,F.EB,F.EB,F.CR,F.CB,F.CR,F.CR,
  F.CR,F.CR,F.EB,F.CB,F.EB,F.CR,F.EB,F.CR,F.CR,F.EB,F.ER,F.CR,F.CR,F.EB,F.EB,F.CR,F.ER,F.CR,
  F.CR,F.ER,F.EB,F.CR,F.EB,F.EB,F.CB,F.CR,F.CR,F.ER,F.CR,F.EB,F.CR,F.CB,F.EB,F.EB,F.CR,F.EB,
  F.CR,F.CR,F.CB,F.EB,F.CB,F.EB,F.CR,F.EB,F.CR,F.EB,F.CB,F.EB,F.CR,F.CR,F.EB,F.ER,F.CR,F.EB,
  F.CB,F.CR,F.EB,F.CR,F.CR,F.ER,F.EB,F.CR,F.EB,F.CR,F.CR,F.CR,F.EB,F.ER,F.CR,F.EB,F.EB,F.CR,
  F.EB,F.CR,F.CR,F.EB,F.EB,F.CR,F.EB,F.ER,F.CR,F.EB,F.CR,F.ER,F.CR,F.EB,F.CB,F.CR,F.CR,F.EB,
  F.EB,F.EB,F.EB,F.CR,F.CB,F.CR,F.ER,F.EB,F.CR,F.CR,F.EB,F.EB,F.CR,F.CB,F.EB,F.CR,F.EB,F.ER,
];

const EXEMPLE_GRID = [
  F.CR,F.CR,F.EB,F.ER,F.CR,F.EB,F.EB,
  F.EB,F.CR,F.EB,F.CR,F.EB,F.CR,F.CR,
  F.EB,F.EB,F.CR,F.CB,F.CR,F.CR,F.EB,
];

const isTarget = (cell) =>
  (cell.type === "star" && cell.color === "red") ||
  (cell.type === "circle" && cell.color === "blue");

export default function TestBarrage({ participant, onComplete }) {
  const ROWS = 10;
  const COLS = 18;

  const [DURATION, setDURATION] = useState(10);
  const [page, setPage] = useState(1);
  const [isExemple, setIsExemple] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [finished, setFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [selected, setSelected] = useState([]);
  const [tempsDebut, setTempsDebut] = useState(Date.now());
  const [grid, setGrid] = useState([]);

  const videoRef = useRef(null);
  // tempsClics[index] = ms entre l'affichage de la grille et le clic sur la forme index
  const tempsClics = useRef({});

  // ---------- Contrôle de l'affichage de la grille du test (page 5) ----------
  // Lignes partie = "affichage" : mesurées à l'apparition de la grille, puis à
  // chaque redimensionnement de la fenêtre (duree_reponse = ms depuis l'apparition)
  const gridRef = useRef(null);
  const debutAffichage = useRef(null);
  const defilementMax = useRef(0);

  const mesurerAffichage = () => {
    const el = gridRef.current;
    if (!el) return;

    const grille = el.getBoundingClientRect();
    const cellule = el.firstElementChild?.getBoundingClientRect();
    const forme = el.querySelector("svg")?.getBoundingClientRect();

    // Le bandeau des étapes (collé en haut) recouvre le haut de la page
    const bandeau = Array.from(document.querySelectorAll("div")).find(
      (d) => getComputedStyle(d).position === "sticky"
    );
    const hautVisible = bandeau ? bandeau.getBoundingClientRect().bottom : 0;

    const entiere =
      grille.top >= hautVisible &&
      grille.left >= 0 &&
      grille.bottom <= window.innerHeight &&
      grille.right <= window.innerWidth;

    const px = (n) => Math.round(n);
    const mesures = {
      fenetre: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      grille_taille: `${px(grille.width)}x${px(grille.height)}`,
      case_taille: cellule ? `${px(cellule.width)}x${px(cellule.height)}` : null,
      forme_taille: forme ? `${px(forme.width)}x${px(forme.height)}` : null,
      grille_visible_entiere: entiere ? 1 : 0,
    };

    const depuis = Date.now() - debutAffichage.current;
    enregistrerLignes(
      Object.entries(mesures).map(([nom, valeur]) =>
        ligne({
          participant,
          epreuve: EPREUVE,
          partie: "affichage",
          question: nom,
          reponse: valeur,
          duree_reponse: depuis,
        })
      )
    );
  };

  useEffect(() => {
    if (page !== 5 || finished || grid.length !== FIXED_GRID.length) return;

    debutAffichage.current = Date.now();
    defilementMax.current = 0;

    // Mesure une fois la grille dessinée
    let image = requestAnimationFrame(() => {
      image = requestAnimationFrame(mesurerAffichage);
    });

    // Redimensionnement : nouvelle mesure une fois le redimensionnement terminé
    let attente = null;
    const surRedim = () => {
      clearTimeout(attente);
      attente = setTimeout(mesurerAffichage, 300);
    };

    // Défilement de la page ou d'un conteneur pendant le test
    const surDefilement = (e) => {
      const cible = e.target === document ? document.scrollingElement : e.target;
      const pos = Math.max(cible?.scrollTop ?? 0, cible?.scrollLeft ?? 0);
      if (pos > defilementMax.current) defilementMax.current = pos;
    };

    window.addEventListener("resize", surRedim);
    window.addEventListener("scroll", surDefilement, true);
    return () => {
      cancelAnimationFrame(image);
      clearTimeout(attente);
      window.removeEventListener("resize", surRedim);
      window.removeEventListener("scroll", surDefilement, true);
    };
  }, [page, finished, grid]);

  const jouerVideo = () => {
    videoRef.current?.play().catch((err) => console.error("Lecture bloquée :", err));
  };

  const continuer = () => {
    onComplete();
  };

  // Choix de la grille (exemple ou vraie grille)
  useEffect(() => {
    const sourceGrid = isExemple ? FIXED_GRID : EXEMPLE_GRID;

    setGrid(
      sourceGrid.map((item, index) => ({
        id: index,
        ...item,
      }))
    );
  }, [isExemple]);

  // Minuteur : uniquement sur l'exercice (page 3) et le test (page 5)
  useEffect(() => {
    if ((page !== 5 && page !== 3) || finished) return;

    setTimeUp(false);

    const timeout = setTimeout(() => {
      setTimeUp(true);
    }, DURATION * 1000);

    return () => clearTimeout(timeout);
  }, [page, finished]);

  // À chaque changement de page : reset du chrono et de la sélection
  useEffect(() => {
    setTempsDebut(Date.now());
    tempsClics.current = {};
    if (page === 3 || page === 5) setSelected([]);
  }, [page]);

  // Passage de l'exercice au test
  useEffect(() => {
    if (page === 4) {
      setIsExemple(true);
      setDURATION(45);
    }
  }, [page]);

  // Fin du temps : sauvegarde (exercice ou test) puis page suivante
  useEffect(() => {
    if (!timeUp || (page !== 5 && page !== 3)) return;

    saveData(page === 3 ? "exercice" : "test", Date.now() - tempsDebut);

    const timeout = setTimeout(() => {
      setPage(page === 3 ? 4 : 6);
      setTimeUp(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [timeUp, page]);

  const lastSelected = selected[selected.length - 1];

  const handleClick = (index) => {
    if (finished) return;

    // ignore les clics "résiduels" juste après l'arrivée sur la page
    if (Date.now() - tempsDebut < 500) return;

    if (lastSelected !== undefined && index < lastSelected) {
      return; // interdit de revenir en arrière
    }

    if (!selected.includes(index)) {
      tempsClics.current[index] = Date.now() - tempsDebut;
    }
    setSelected((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  // Une ligne par forme sélectionnée, dans l'ordre des clics :
  //  partie        = "exercice" ou "test"
  //  question      = rang du clic (1 = première forme cliquée)
  //  reponse       = position de la forme dans la grille (1 = en haut à gauche,
  //                  ligne par ligne ; 1 à 180 pour le test, 1 à 21 pour l'exercice)
  //  duree_reponse = ms entre l'affichage de la grille et ce clic
  //  nb_symboles_selectionnes / nb_symboles_selectionnes_corrects : totaux, répétés sur chaque ligne
  // Aucune forme sélectionnée (temps écoulé) : une seule ligne, reponse vide, totaux à 0.
  const saveData = (partie, tempsTotal) => {
    const correctes = selected.filter((i) => isTarget(grid[i])).length;
    const commun = {
      participant,
      epreuve: EPREUVE,
      partie,
      nb_symboles_selectionnes: selected.length,
      nb_symboles_selectionnes_corrects: correctes,
      duree_totale_epreuve: tempsTotal,
    };

    const lignes =
      selected.length > 0
        ? selected.map((index, rang) =>
            ligne({
              ...commun,
              question: rang + 1,
              reponse: index + 1,
              duree_reponse: tempsClics.current[index] ?? null,
              time_stamp:
                tempsClics.current[index] != null
                  ? chrono(tempsDebut + tempsClics.current[index])
                  : chrono(),
            })
          )
        : [ligne(commun)];

    if (partie === "test") {
      // Défilement maximal pendant le test (px) : 0 = la grille n'a pas eu à défiler
      lignes.push(
        ligne({
          participant,
          epreuve: EPREUVE,
          partie: "affichage",
          question: "defilement_max_px",
          reponse: Math.round(defilementMax.current),
          duree_reponse: tempsTotal,
        })
      );
    }

    enregistrerLignes(lignes);
  };

  const finishTest = () => {
    setFinished(true);
  };

  // Tous les hooks sont déclarés au-dessus : les return conditionnels sont sans risque

  if (timeUp && (page === 5 || page === 3)) {
    return (
      <div className="barrage-container"
            style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100svh",
      }}>
        <h1>Tempo scaduto</h1>
      </div>
    );
  }

  const boutonVisible = !finished && selected.length > 0;

  if (page === 1) {
    return (
      <div className="instructions">
        <h2>
          Passiamo alla seconda <b>prova di cancellazione</b>.<br /><br />
          Devi cliccare su tutte le figure geometriche presentate nel riquadro procedendo nell’ordine seguente:
          riga dopo riga, dalla prima all’ultima riga, da sinistra a destra.
          Lavora più velocemente che puoi senza fare errori! Hai solo 45 secondi!
          Non puoi tornare indietro per contrassegnare le figure che hai saltato.
        </h2>

        <BoutonAudio fichier="consignes_barrage2.mp3" />
        <button onClick={() => setPage(10)} style={styleBoutonContinuer}>
          Inizia
        </button>
      </div>
    );
  }

  if (page === 2) {
    return (
      <div className="instructions">
        <h2>
          Devi cliccare su <b>tutte le figure geometriche</b> presentate nel riquadro procedendo nell’ordine seguente:
          riga dopo riga, dalla prima all’ultima riga, da sinistra a destra.
          Lavora più velocemente che puoi senza fare errori! Hai solo 45 secondi!
          Non puoi tornare indietro per contrassegnare le figure che hai saltato.
        </h2>
        {!finished && (
          <button onClick={() => setPage(10)} style={styleBoutonContinuer}>
            Inizia
          </button>
        )}
      </div>
    );
  }

  if (page === 10) {
    return (
      <div className="instructions">
        <h2 style={{ marginBottom: "3svh" }}>
          Avvia il video e guarda l'esempio. Se necessario, puoi rivederlo. Dopodiché toccherà a te.
        </h2>
        <video
          style={{ border: "1px solid black" }}
          ref={videoRef}
          src="/videos/exemple_barrage2.mov"
          width="900"
          playsInline
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
        />

        <button onClick={() => setPage(3)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  if (page === 3) {
    return (
      <div className="instructions">
        <h2 style={{ marginBottom: "5svh" }}>Esercizio</h2>
        <h2 style={{ marginBottom: "5svh" }}>Hai 10 secondi.</h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1vh",
            backgroundColor: "white",
            border: "0.2svh solid black",
            marginBottom: "5svh",
          }}
        >
          <Shape type="star" color="red" size={SIZE_LEGENDE} />
          <Shape type="circle" color="blue" size={SIZE_LEGENDE} />
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(7, 1fr)`,
            backgroundColor: "white",
          }}
        >
          {grid.map((cell, index) => {
            const clicked = selected.includes(index);

            return (
              <div
                key={cell.id}
                className={`cell ${clicked ? "selected-cell" : ""}`}
                onClick={() => handleClick(index)}
              >
                <Shape type={cell.type} color={cell.color} size={SIZE_EXEMPLE} />
              </div>
            );
          })}
        </div>

        <div style={{ height: "3svh", marginTop: "0svh" }}>
          {!finished && selected.length > 0 && (
            <button
              onClick={() => {
                saveData("exercice", Date.now() - tempsDebut);
                setPage(4);
                setIsExemple(true);
              }}
              style={styleBoutonContinuer}
            >
              Conferma
            </button>
          )}
        </div>
      </div>
    );
  }

  if (page === 4) {
    return (
      <div className="instructions">
        <h2>Ora che ti sei esercitato/a, passiamo al test. Hai 45 secondi.</h2>

        <button
          onClick={() => {
            setSelected([]);
            setPage(5);
          }}
          style={styleBoutonContinuer}
        >
          Continua
        </button>
      </div>
    );
  }

  if (page === 5) {
    return (
      <div className="instructions">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1vh",
            backgroundColor: "white",
            border: "0.2svh solid black",
            marginBottom: "5svh",
          }}
        >
          <Shape type="star" color="red" size={SIZE_LEGENDE} />
          <Shape type="circle" color="blue" size={SIZE_LEGENDE} />
        </div>

        <div
          ref={gridRef}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            backgroundColor: "white",
          }}
        >
          {grid.map((cell, index) => {
            const clicked = selected.includes(index);

            return (
              <div
                key={cell.id}
                className={`cell ${clicked ? "selected-cell" : ""}`}
                onClick={() => handleClick(index)}
              >
                <Shape type={cell.type} color={cell.color} size={SIZE_TEST} />
              </div>
            );
          })}
        </div>

        <button
          style={{
            ...styleBoutonContinuer,
            margin: "2svh auto 0 auto",
            visibility: boutonVisible ? "visible" : "hidden",
          }}
          onClick={() => {
            finishTest();
            saveData("test", Date.now() - tempsDebut);
            setPage(6);
          }}
          disabled={!boutonVisible}
          tabIndex={boutonVisible ? 0 : -1}
          aria-hidden={!boutonVisible}
        >
          Conferma
        </button>
      </div>
    );
  }

  if (page === 6) {
    return (
      <div className="instructions">
        <h2>Complimenti! Hai completato la seconda prova di cancellazione. </h2>

        <button onClick={() => continuer()} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  return null;
}