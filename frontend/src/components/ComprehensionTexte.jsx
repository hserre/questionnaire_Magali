import React, { useEffect, useRef, useState } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import {
  ligne,
  enregistrerLignes,
  enregistrerDureeTotale,
  suffixeLangue,
} from "./sauvegarde";

// ---------------------------------------------------------------------------
// Contenu des épreuves : italien (tour === 1, avec exemple) et français (sinon, sans exemple)
// "correct" = bonne réponse attendue ("vrai" ou "faux"), non affichée aux participants
// ---------------------------------------------------------------------------
const CONTENU = {
  it: {
    titreReglement: "",
    intro:
      "Passiamo ora alla prova di <b>comprensione del testo</b>. <br></br>Leggi i seguenti articoli, tratti dal Regolamento del Premio Strega, e <b>indica se l’affermazione corrispondente è Vera (V) o Falsa (F)</b>. Vedrai prima un esempio e passerai al test.",
    exemple: {
      texte:
        "<em>Art. 1.</em> Il Premio Strega ha sede presso la Fondazione Maria e Goffredo Bellonci (Roma, via Fratelli Ruspoli 2).",
      affirmation: "Il Premio Strega ha sede a Verona, via Fratelli Ruspoli 2.",
      correct: "faux",
      retourErreur: "No, il Premio Strega ha sede a Roma.",
      retourBravo: "Bravo/a !",
    },
    articles: [
      {
        texte:
          "<em>Art. 2.</em> È istituito a Roma il Premio letterario Strega degli “Amici della domenica”, nome con cui sono identificati i componenti della giuria dal gruppo che si riuniva in casa Bellonci il pomeriggio della domenica.",
        affirmation: "Il gruppo si riuniva in casa Bellonci il sabato pomeriggio.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 3.</em> La giuria era composta alla data di fondazione del Premio (1947) da centosettanta “Amici” e comprende attualmente quattrocento votanti.",
        affirmation:
          "Il numero dei membri della giuria del Premio ha registrato un netto aumento nel corso degli anni.",
        correct: "vrai",
      },
      {
        texte:
          "<em>Art. 4.</em> Il Premio è assegnato annualmente a un libro di narrativa scritto in lingua italiana.",
        affirmation:
          "Il Premio viene assegnato ogni semestre a un libro di narrativa scritto in italiano.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 5.</em> Le opere in concorso sono pubblicate in prima edizione tra il 1° aprile dell’anno precedente e il 31 marzo dell’anno in corso.",
        affirmation:
          "Le opere ammesse al concorso devono essere state pubblicate al più tardi nel mese di marzo dell’anno precedente.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 6.</em> La prima votazione è scrutinata presso la Fondazione Bellonci; la seconda votazione e la proclamazione del vincitore si svolgono a Roma, in sede scelta dal Comitato direttivo.",
        affirmation:
          "Le operazioni di spoglio di tutti i turni delle votazioni si svolgono presso la sede della Fondazione Bellonci.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 7.</em> Gli scrittori che hanno vinto il Premio Strega non possono concorrere se non dopo tre edizioni successive.",
        affirmation:
          "I vincitori del Premio Strega possono concorrere nuovamente dopo tre edizioni dalla loro vincita.",
        correct: "vrai",
      },
    ],
  },

  fr: {
    titreReglement: "",
    intro: "Passiamo ora alla prova di <b>comprensione del testo</b>. Leggi i seguenti articoli, tratti dal Regolamento di una scuola primaria, e indica se l’affermazione corrispondente è Vera (V) o Falsa (F).",
    exemple: null, // pas d'exemple pour la version française
    articles: [
      {
        texte:
          "<em>Art. 1.</em> L’accueil des familles débute à 8h dans les espaces prévus, puis les élèves sont pris en charge dans les classes à partir de 8h05 en élémentaire et 8h10 en maternelle.",
        affirmation:
          "En maternelle, les enfants sont pris en charge dans les classes par les enseignants à partir de 8h10.",
        correct: "vrai",
      },
      {
        texte:
          "<em>Art. 2.</em> Lorsqu’une tierce personne est chargée de récupérer l’élève, il convient d’en informer préalablement l’enseignant et d’adresser une autorisation par courriel.",
        affirmation:
          "Lorsqu’une tierce personne vient chercher un enfant, elle doit uniquement présenter la carte de l’établissement.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 3.</em> Une garderie payante est proposée jusqu’à 18h du lundi au vendredi et, en cas d’imprévu, les familles doivent prévenir l’école dans les meilleurs délais.",
        affirmation:
          "Une garderie gratuite accueille les enfants jusqu’à 18h du lundi au vendredi.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 4.</em> Concernant ramassage scolaire, la responsabilité de l’établissement prend effet à l’accueil des élèves dans les classes et s’achève à la fin des cours.",
        affirmation:
          "L’école n’est pas responsable des élèves utilisant le ramassage scolaire avant l’heure d’accueil en classe et après la sortie.",
        correct: "vrai",
      },
      {
        texte:
          "<em>Art. 5.</em> En cas d’absence, les familles doivent informer l’établissement par écrit en précisant le motif et la durée prévisible.",
        affirmation:
          "Lors d’une absence de courte durée, l’école enverra aux familles du travail à effectuer à la maison.",
        correct: "faux",
      },
      {
        texte:
          "<em>Art. 6.</em> La restauration scolaire est un service facultatif dont l’inscription s’effectue via la plateforme Eduka.",
        affirmation: "L’inscription à la cantine s’effectue sur une plateforme.",
        correct: "vrai",
      },
    ],
  },
};

// Textes de l’interface selon la langue
const TEXTES = {
  it: {
    titre: "Comprensione del testo",
    initier: 'Inizia',
    continuer: "Continua",
    confirmer: "Conferma",
    exemple: "Esempio",
    transition: "Ora che ti sei esercitato/a, passiamo al test.",
    vrai: "Vero",
    faux: "Falso",
  },
  fr: {
    titre: "Comprensione del testo",
    initier: 'Inizia',
    continuer: "Continua",
    confirmer: "Conferma",
    exemple: "Esempio",
    transition: "Ora che avete capito, cliccate su “Continua” per passare al test.",
    vrai: "Vero",
    faux: "Falso",
  },
};

// Valeurs enregistrées (identiques quelle que soit la langue d’affichage)
const OPTIONS = ["vrai", "faux"];

// Page de fin : une ligne par élément du tableau
const MESSAGES_FIN = {
  1: ["Complimenti! Hai completato la comprensione del testo."],
  2: ["Complimenti! Hai completato la comprensione del testo."],
};

// Dimensions des deux zones : identiques sur toutes les pages,
// ce qui garde le bouton toujours au même endroit
const HAUTEUR_CONTENU = "40svh";
const HAUTEUR_BOUTON = "20svh";

export default function ArticlesVraiFaux({ participant, tour, onComplete }) {
  // Italien (avec exemple) si tour === 1, français (sans exemple) sinon
  const langue = Number(tour) === 1 ? "it" : "fr";
  const t = TEXTES[langue];
  const contenu = CONTENU[langue];

  // phase : "exemple" (italien uniquement) puis "test"
  const [phase, setPhase] = useState(contenu.exemple ? "exemple" : "test");
  // page : "intro" | "consigne" | "article" | "affirmation" | "transition" | "fin"
  const [page, setPage] = useState("intro");
  const [indexArticle, setIndexArticle] = useState(0);

  // reponses[index] = "vrai" | "faux" | null  (index 0 = premier article du test)
  const [reponses, setReponses] = useState({});
  const [reponseExemple, setReponseExemple] = useState(null);

  const EPREUVE = `ComprehensionTexte_${suffixeLangue(tour)}`;

  // debutArticle : affichage du texte de l'article en cours (lecture + réponse)
  // debutEpreuve : affichage du premier article du test
  const debutArticle = useRef(null);
  const debutEpreuve = useRef(null);

  useEffect(() => {
    if (page === "article" && phase === "test") {
      debutArticle.current = Date.now();
      if (debutEpreuve.current === null) debutEpreuve.current = debutArticle.current;
    }
  }, [page, phase, indexArticle]);

  const enExemple = phase === "exemple";
  const item = enExemple ? contenu.exemple : contenu.articles[indexArticle];
  const reponseActuelle = enExemple ? reponseExemple : reponses[indexArticle];
  const aRepondu = OPTIONS.includes(reponseActuelle);

  // Coche une case ; recliquer sur la case cochée la décoche
  const choisir = (option) => {
    if (enExemple) {
      setReponseExemple((prev) => (prev === option ? null : option));
    } else {
      setReponses((prev) => ({
        ...prev,
        [indexArticle]: prev[indexArticle] === option ? null : option,
      }));
    }
  };

  // Une ligne par article du test (l'exemple n'est pas enregistré)
  const saveData = (index, reponse) => {
    const maintenant = Date.now();
    const dernier = index + 1 >= contenu.articles.length;
    const dureeTotale = dernier ? maintenant - debutEpreuve.current : null;

    enregistrerLignes([
      ligne({
        participant,
        epreuve: EPREUVE,
        partie: "test",
        question: contenu.articles[index].affirmation,
        reponse,
        duree_reponse: maintenant - debutArticle.current,
        duree_totale_epreuve: dureeTotale,
      }),
    ]).then(() => {
      if (dernier) enregistrerDureeTotale(participant, EPREUVE, dureeTotale);
    });
  };

  // Après la réponse : transition (fin de l’exemple), article suivant, ou fin
  const suivant = () => {
    if (enExemple) {
      setPage("transition");
      return;
    }

    saveData(indexArticle, reponses[indexArticle]);

    if (indexArticle + 1 < contenu.articles.length) {
      setIndexArticle((i) => i + 1);
      setPage("article");
    } else {
      setPage("fin");
    }
  };

  const messageFin = MESSAGES_FIN[Number(tour)] ?? MESSAGES_FIN[2];

  // Retour affiché pendant l’exemple uniquement
  let retourExemple = null;
  if (enExemple && aRepondu) {
    retourExemple =
      reponseExemple === item.correct ? item.retourBravo : item.retourErreur;
  }

  // Cases Vrai / Faux. Si visible = false, elles gardent leur place mais sont invisibles et inactives
  const renderCases = (visible) => (
    <div
      style={{
        fontSize: "3vh",
        display: "flex",
        justifyContent: "center",
        gap: "8vh",
        marginTop: "5svh",
        visibility: visible ? "visible" : "hidden",
      }}
    >
      {OPTIONS.map((option) => (
        <label
          key={option}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5vh",
            fontSize: "4vh",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={visible && reponseActuelle === option}
            onChange={() => visible && choisir(option)}
            tabIndex={visible ? 0 : -1}
            style={{ width: "4vh", height: "4vh", cursor: "pointer" }}
          />
          {t[option]}
        </label>
      ))}
    </div>
  );

  // Structure commune à toutes les pages :
  //  - une zone de contenu de hauteur fixe
  //  - une zone de bouton de hauteur fixe (le bouton reste donc toujours au même endroit)
  // texteBouton = null -> pas de bouton (zone vide conservée)
  // boutonVisible = false -> bouton présent mais invisible et inactif
  const renderPage = ({ contenuPage, texteBouton, onClick, boutonVisible = true }) => (
    <div className="instructions">
      <div
        style={{
          height: HAUTEUR_CONTENU,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {contenuPage}
      </div>

      <div
        style={{
          height: HAUTEUR_BOUTON,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {texteBouton && (
          <button
            onClick={onClick}
            disabled={!boutonVisible}
            tabIndex={boutonVisible ? 0 : -1}
            aria-hidden={!boutonVisible}
            style={{
              ...styleBoutonContinuer,
              visibility: boutonVisible ? "visible" : "hidden",
            }}
          >
            {texteBouton}
          </button>
        )}
      </div>
    </div>
  );

  // 1) Introduction
  if (page === "intro") {
    return renderPage({
      contenuPage: (
        <>
          <h2 dangerouslySetInnerHTML={{ __html: contenu.intro }} />
          <BoutonAudio fichier={Number(tour) === 1 ? "consignes_comprehensionTexte.mp3" : "consignes_comprehensionTexte_FR.mp3"} />
        </>
      ),
      texteBouton: t.initier,
      onClick: () => setPage("article"),
    });
  }

  // 2) Consigne
/*  if (page === "consigne") {
    return renderPage({
      contenuPage: <h2 dangerouslySetInnerHTML={{ __html: contenu.consigne }} />,
      texteBouton: t.continuer,
      // Italien : la phase "exemple" est déjà active, donc la page "article"
      // qui suit affichera l’exemple avec son titre.
      // Français : elle affichera directement le premier article du test.
      onClick: () => setPage("article"),
    });
  } */

  // 3) Texte de l’article (exemple OU test, selon la phase)
  if (page === "article") {
    return renderPage({
      contenuPage: (
        <>
          {enExemple && (
            <h2 style={{ fontSize: "7svh", marginBottom: "5svh" }} dangerouslySetInnerHTML={{ __html: t.exemple }} />
          )}
          {contenu.titreReglement && <h2>{contenu.titreReglement}</h2>}

          <div>
            <h2 style={{ marginBottom: "5svh" }} dangerouslySetInnerHTML={{ __html: item.texte }} />
          </div>

          {/* Cases présentes mais invisibles */}
          {renderCases(false)}
        </>
      ),
      texteBouton: t.continuer,
      onClick: () => setPage("affirmation"),
    });
  }

  // 4) Affirmation avec les deux cases Vrai / Faux
  if (page === "affirmation") {
    return renderPage({
      contenuPage: (
        <>
          {enExemple && (
            <h2 style={{ fontSize: "7svh", marginBottom: "5svh" }}>{t.exemple}</h2>
          )}
          <h2 style={{ marginBottom: "5svh" }}>{item.affirmation}</h2>

          {renderCases(true)}

          {/* Retour sur la réponse, uniquement pendant l’exemple */}
          {enExemple && (
            <div style={{ minHeight: "6svh", marginTop: "2svh", fontSize: "3.5vh" }}>
              {retourExemple}
            </div>
          )}
        </>
      ),
      texteBouton:  enExemple ? t.continuer : t.confirmer,
      onClick: suivant,
      boutonVisible: aRepondu, // le bouton n’apparaît qu’une fois une case cochée
    });
  }

  // 5) Transition entre l’exemple et le test (italien uniquement)
  if (page === "transition") {
    return renderPage({
      contenuPage: <h2>{t.transition}</h2>,
      texteBouton: t.continuer,
      onClick: () => {
        setPhase("test");
        setIndexArticle(0);
        setPage("article");
      },
    });
  }

  // 6) Page de fin
  if (page === "fin") {
    return renderPage({
      contenuPage: (
        <h2>
          {messageFin.map((ligne, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {ligne}
            </React.Fragment>
          ))}
        </h2>
      ),
      texteBouton: "Continua",
      onClick: () => onComplete(),
    });
  }

  return null;
}