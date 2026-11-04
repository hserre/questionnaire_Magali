import React, { useEffect, useRef, useState } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import TableauEchelle from "./TableauEchelle";
import { enregistrerPageTableau } from "./sauvegarde";

function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export default function StrategieTable({ participant, onComplete }) {
  const items1 = [
    "Pensare alle cose che eventualmente già si conoscono sull’argomento",
    "Dare una scorsa veloce al testo prima di iniziare la lettura",
    "Leggere almeno una volta ad alta voce il testo",
    "Sottolineare durante la prima lettura",
    "Sottolineare usando evidenziatori o matite di diverso colore",
    "Prendere appunti durante lo studio del testo",
    "Durante la lettura cercare di prevedere ciò che verrà detto nelle parti successive del testo",
    "Durante lo studio del testo ripetersi con parole proprie i punti più salienti",
    "Scrivere a fianco del testo delle idee guida",
    "Cercare di memorizzare i punti principali con qualche trucco mnemonico (metodo dei luoghi, metodo della storia, ecc.)",
    "Controllare che si stia comprendendo il testo",
    "Prendere immediatamente delle contromisure se si ha l’impressione di non capire",
    "Lasciar perdere il punto specifico o sospendere lo studio se la sensazione di non comprendere si protrae e riprenderlo successivamente",
    "Cercare di integrare lo studio del testo con altri testi o sussidi",
    "Decidere di non studiare certi argomenti perché poco rilevanti",
    "Durante lo studio riassumere per iscritto con parole proprie",
    "Farsi schemi",
    "Informarsi su quali potrebbero essere le domande d’esame",
    "Immaginare per proprio conto quali potrebbero essere le domande dell’esame",
    "Fare una prova dell’esame, anticipando con l’immaginazione le caratteristiche dell’evento, in modo da essere preparato/a a gestire l’ansia e gli imprevisti",
  ];

  // Le premier tableau est divisé en deux pages de 10 items
  const [items1a] = useState(() => melanger(items1.slice(0, 10)));
  const [items1b] = useState(() => melanger(items1.slice(10)));

  const items2Source = [
    "Prendere precauzioni relative al proprio benessere psicofisico (alimentazione, sonno, orari) per massimizzare i benefici dello studio",
    "Controllare e prendere precauzioni per non distrarsi",
    "Studiare in ambienti comuni (ad esempio in biblioteca, nella camera dove studia qualcun altro, ecc.) per farsi ispirare dall’esempio altrui e non disperdersi",
    "Accompagnare lo studio con musica o altra fonte audiovisiva di sottofondo",
    "Farsi una tabella di marcia per lo studio: quanto tempo? Distribuito come?",
    "Scegliere un modo diverso di affrontare lo studio a seconda del tipo di attività e di obiettivi",
    "Intervallare lo studio delle materie",
    "Ripassare a distanza di tempo",
    "Evidenziare i punti poco ricordati e concentrare il ripasso su di essi",
    "Studiare con un amico",
    "Ripetere con un amico",
  ];

  const [items2] = useState(() => melanger(items2Source));

  const TITRE_TABLEAU_1 =
    "Testo di francese come lingua straniera in vista di un esame";

  // réponses[index] = 1 à 7 (index local à la page affichée, remis à zéro entre les pages)
  const [reponses, setReponses] = useState({});
  const [page, setPage] = useState(1);

  const EPREUVE = "StrategiesEtude_reel";
  const PAGES_TABLEAU = [5, 6, 7];

  // debutPage : affichage de la page de tableau en cours
  // tempsClic[ligne] : ms entre l'affichage de la page et le dernier clic sur la ligne
  // debutEpreuve : affichage de la première page de tableau
  const debutPage = useRef(null);
  const tempsClic = useRef({});
  const debutEpreuve = useRef(null);

  useEffect(() => {
    if (PAGES_TABLEAU.includes(page)) {
      debutPage.current = Date.now();
      tempsClic.current = {};
      if (debutEpreuve.current === null) debutEpreuve.current = debutPage.current;
    }
  }, [page]);

  const choisir = (ligne, valeur) => {
    tempsClic.current[ligne] = Date.now() - debutPage.current;
    setReponses((prev) => ({
      ...prev,
      [ligne]: valeur,
    }));
  };

  // Validation d'une page : une ligne par item, puis page suivante.
  // Sur la dernière page, la durée totale est ajoutée à toutes les lignes de l'épreuve.
  const validerPage = (items, partie, pageSuivante, derniere = false) => {
    enregistrerPageTableau({
      participant,
      epreuve: EPREUVE,
      partie,
      items,
      reponses,
      tempsClic: tempsClic.current,
      debutPage: debutPage.current,
      dureeTotale: derniere ? Date.now() - debutEpreuve.current : null,
    });
    setReponses({});
    setPage(pageSuivante);
  };

  const intro1 = `Rivedi, ancora una volta, tutte le strategie per studiare <b>un testo di francese come lingua straniera</b>
   in vista di un esame e per affrontare il lavoro universitario in generale, elencate qui di seguito. Questa volta non
   si tratta più di immaginare il caso ideale di una persona che studi in condizioni ottimali, ma di riflettere sulle tue
   reali abitudini di studio.`;

  const intro2 = `È importante tenere presente che l’elenco è volutamente lungo e che, nella realtà, sarebbe impossibile mettere
   in pratica tutte queste strategie contemporaneamente. Il tuo compito consiste quindi nell’esaminare ogni strategia separatamente,
   senza preoccuparti delle altre, e nell’indicare in che misura essa rispecchia il tuo modo abituale di studiare. L’obiettivo è
    ottenere un quadro fedele delle tue pratiche personali, indipendentemente da ciò che potrebbe essere considerato ideale o
    raccomandato.`;

  const intro3 = `
    1 = nessuna utilità
    2 = quasi nessuna utilità
    3 = scarsa utilità
    4 = moderata utilità
    5 = notevole utilità
    6 = eccellente utilità
    7 = massima utilità`;


  // Affiche un tableau de questions (taille adaptée à la fenêtre, cases carrées)
  const renderTable = (titre, items, onNext) => (
    <TableauEchelle
      titre={titre}
      items={items}
      nbEchelle={7}
      reponses={reponses}
      onChoisir={choisir}
      onNext={onNext}
    />
  );

  if (page === 1) {
    return (
      <div className="instructions"
      >

        <h2 dangerouslySetInnerHTML={{ __html: 
         "Terminiamo con la seconda parte del questionario sulle <b>strategie di studio</b>. <br></br> <b>Considera ora le tue reali abitudini di studio</b>. <b>Valuta obbligatoriamente tutti gli item</b>, uno alla volta, indicando in che misura ciascuna strategia descrive il tuo modo abituale di studiare il francese e di affrontare l'università. Valuta ogni strategia indipendentemente dalle altre."
         }} />

        <BoutonAudio fichier="consignes_strategiesEtude2.mp3" />
        <button onClick={() => setPage(4)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  /* if (page === 2) {
    return (
      <div className="instructions">
       <h2 dangerouslySetInnerHTML={{ __html: intro1 }} />
        <button onClick={() => setPage(3)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

    if (page === 3) {
    return (
      <div className="instructions">
       <h2 dangerouslySetInnerHTML={{ __html: intro2 }} />
        <button onClick={() => setPage(4)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  } */

  if (page === 4) {
    return (
      <div className="instructions">
                <h2 dangerouslySetInnerHTML={{ __html: 
         "Per ciascuna delle strategie proposte, assegna un punteggio su una scala da 1 a 7, indicando:"
         }} />
        <h2 style={{ whiteSpace: 'pre', textAlign:'left' }}>{intro3}</h2>
        <BoutonAudio fichier="echelle_strategieEtude.mp3" />
        <button onClick={() => setPage(5)} style={styleBoutonContinuer}>
          Inizia
        </button>
      </div>
    );
  }

  // Tableau 1, première partie
  if (page === 5) {
    return renderTable(TITRE_TABLEAU_1, items1a, () =>
      validerPage(items1a, "tableau1", 6)
    );
  }

  // Tableau 1, deuxième partie
  if (page === 6) {
    return renderTable(`${TITRE_TABLEAU_1} (2ª parte)`, items1b, () =>
      validerPage(items1b, "tableau1", 7)
    );
  }

  // Tableau 2
  if (page === 7) {
    return renderTable("Gli studi universitari in generale", items2, () =>
      validerPage(items2, "tableau2", 8, true)
    );
  }

  if (page==8){
    return(
      <div className="instructions">
        <h2>Complimenti! Hai completato la seconda parte del questionario sulle strategie di studio.
            </h2>
          <button
              onClick={onComplete}
              style={styleBoutonContinuer}
          >
              Continua
          </button>
        </div>
    )
  }
  return null;
}
