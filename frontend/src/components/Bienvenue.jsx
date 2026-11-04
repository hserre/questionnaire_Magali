import React, { useEffect, useRef, useState } from "react";
import BoutonAudio from "./BoutonAudio";
import { styleBoutonContinuer } from "./InterfaceUtils";
import { API_URL } from "../config";
import { ligne, enregistrerLignes, enregistrerDureeTotale } from "./sauvegarde";
import Consentement from "./Consentement";
import { VERSION_INFORMATIVA } from "./informativaConsenso";

// Le questionnaire d'accueil est enregistré dans la table des épreuves,
// une ligne par question, sous ce nom d'épreuve
const EPREUVE = "infos_participant";

const QUESTION_MADRELINGUA = "Prima di cominciare, l'italiano è la tua madrelingua?";

// Libellé enregistré dans la colonne "question", selon l'identifiant de l'étape
const LIBELLES = {
  ordi: "Per questo questionario, utilizzerai :",
  genre: "Sei:",
  naissance: "Data di nascita:",
  annoCorso: "Anno di corso attuale e livello di studi:",
  posizioneFrancese: "Posizione del francese nella classifica delle lingue studiate:",
  anniFrancese: "Numero di anni di studio pregresso del francese:",
  dsa: "Hai una diagnosi ufficiale che confermi il tuo disturbo (o i tuoi disturbi) DSA?",
  dsaTipi: "Quale/i DSA? (Puoi selezionare più opzioni)",
  tipoDislessia: "Che tipo di dislessia?",
  adhd: "Hai una diagnosi ufficiale che confermi il tuo ADHD?",
  tipoAdhd: "Che tipo di ADHD?",
};


const styleSelect = {
  padding: "2svh",
  fontSize: "16px",
};

const optionsOrdi = ["il mouse", "il trackpad"];
const optionsGenre = ["Uomo", "Donna", "Altro"];

const optionsAnnoCorso = [
  "Prima annualità Laurea triennale",
  "Seconda annualità Laurea triennale",
  "Terza annualità Laurea triennale",
  "Prima annualità Laurea magistrale",
  "Seconda annualità Laurea magistrale",
];

const optionsSiNo = ["Sì", "No"];

const optionsPosizioneFrancese = ["L2", "L3", "L4", "L5", "Altro"];

// Questions de santé (diagnostic officiel)
const optionsDiagnosi = ["Sì", "No", "Non desidero rispondere"];

// DSA : plusieurs cases possibles
const optionsTipiDsa = ["Dislessia", "Disortografia", "Disgrafia", "Discalculia"];

// Si "Dislessia" est cochée : un seul sous-type
const optionsTipoDislessia = [
  "Dislessia fonologica",
  "Dislessia superficiale (o lessicale)",
  "Dislessia mista (o profonda)",
  "Non desidero specificare",
];

const optionsTipoAdhd = [
  "Tipo prevalentemente inattentivo",
  "Tipo prevalentemente iperattivo/impulsivo",
  "Tipo combinato",
  "Non desidero specificare",
];

// Menus déroulants de la date de naissance
const optionsGiorno = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);

const optionsMese = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

const anneeCourante = new Date().getFullYear();
const optionsAnno = Array.from({ length: 100 }, (_, i) =>
  String(anneeCourante - i)
);

// Génère un code à 6 chiffres absent de la base userNames, puis l'y enregistre.
// Réessaie avec un autre code tant que celui tiré existe déjà (10 essais max).
async function creerCodeUnique() {
  for (let essai = 0; essai < 10; essai++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const res = await fetch(
      `${API_URL}/api/check_code?code=${encodeURIComponent(code)}`
    );
    const data = await res.json();

    if (!data.existe) {
      const ajout = await fetch(`${API_URL}/api/add_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: code }),
      });
      if (!ajout.ok) throw new Error("Échec de l'enregistrement du code");
      return code;
    }
  }
  throw new Error("Impossible de générer un code unique");
}

// Calcule l'âge en années et en mois à partir d'une date "AAAA-MM-GG"
function calculerAge(dateStr) {
  if (!dateStr) return null;
  const [a, m, j] = dateStr.split("-").map(Number);
  if (!a || !m || !j) return null;

  const naissance = new Date(a, m - 1, j);
  const auj = new Date();
  if (isNaN(naissance) || naissance > auj) return null;
  if (naissance.getMonth() !== m - 1) return null; // date impossible (ex. 31/02)

  let annees = auj.getFullYear() - naissance.getFullYear();
  let mois = auj.getMonth() - naissance.getMonth();
  if (auj.getDate() < naissance.getDate()) mois -= 1;
  if (mois < 0) {
    annees -= 1;
    mois += 12;
  }
  return { annees, mois };
}

// ---------- Styles ----------

const styleLabel = {
  fontSize: "clamp(18px, 3svh, 28px)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const styleCase = {
  width: "clamp(28px, 4.5svh, 44px)",
  height: "clamp(28px, 4.5svh, 44px)",
  cursor: "pointer",
  flexShrink: 0,
};

const styleListe = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "1.5svh",
};

// Page d'une question : le bloc est centré dans la fenêtre,
// mais son contenu est aligné à gauche
const stylePageQuestion = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100svh",
  boxSizing: "border-box",
  padding: "4svh 5vw",
};

const styleBlocQuestion = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  textAlign: "left",
  maxWidth: "min(90vw, 800px)",
};

const styleTitreQuestion = {
  fontSize: "clamp(24px, 5svh, 40px)",
  margin: "0 0 4svh 0",
  textAlign: "left",
  textWrap: "pretty",
};

const styleChamp = {
  width: "min(60vw, 300px)",
  padding: "2svh",
  fontSize: "16px",
};

// ---------- Composants ----------

function TitreQuestion({ children }) {
  return <p style={styleTitreQuestion}>{children}</p>;
}

// Un seul choix possible
function GroupeRadio({ titre, nom, options, valeur, onChange }) {
  return (
    <>
      <TitreQuestion>{titre}</TitreQuestion>
      <div style={styleListe}>
        {options.map((option) => (
          <label key={option} style={styleLabel}>
            <input
              type="radio"
              name={nom}
              value={option}
              checked={valeur === option}
              onChange={(e) => onChange(e.target.value)}
              style={styleCase}
            />
            {option}
          </label>
        ))}
      </div>
    </>
  );
}

// Plusieurs choix possibles
function GroupeCases({ titre, options, valeurs, onToggle }) {
  return (
    <>
      <TitreQuestion>{titre}</TitreQuestion>
      <div style={styleListe}>
        {options.map((option) => (
          <label key={option} style={styleLabel}>
            <input
              type="checkbox"
              checked={valeurs.includes(option)}
              onChange={() => onToggle(option)}
              style={styleCase}
            />
            {option}
          </label>
        ))}
      </div>
    </>
  );
}

export default function Bienvenue({ onComplete, setIsDys, setParticipant }) {
  // 1 = accueil, 2 = langue maternelle, 3 = introduction,
  // 4 = questionnaire (une question par page), "exclu" = non éligible
  const [sousPage, setSousPage] = useState(1);

  // Index de la question affichée dans le questionnaire
  const [etape, setEtape] = useState(0);

  const [madrelingua, setMadrelingua] = useState("");

  // true pendant la création du code (évite un double clic)
  const [enCours, setEnCours] = useState(false);

  // Code participant, créé au début du questionnaire pour pouvoir
  // enregistrer les réponses à chaque étape
  const [code, setCode] = useState("");

  // debutQuestion : affichage de la question en cours
  // debutAccueil : affichage de la 1re question du questionnaire (après le consentement)
  const debutQuestion = useRef(null);
  const debutAccueil = useRef(null);
  const dureeMadrelingua = useRef(null);
  // Réponses de la page de consentement, enregistrées dès que le code existe
  const consentement = useRef(null);

  useEffect(() => {
    if (sousPage === 2 || sousPage === 4) {
      debutQuestion.current = Date.now();
      if (sousPage === 4 && debutAccueil.current === null) {
        debutAccueil.current = debutQuestion.current;
      }
    }
  }, [sousPage, etape]);

  const [reponses, setReponses] = useState({
    ordi: "",
    genre: "",
    giorno: "",
    mese: "",
    anno: "",
    annoCorso: "",
    posizioneFrancese: "",
    anniFrancese: "",
    dsa: "", // "Sì" / "No" / "Non desidero rispondere"
    dsaTipi: [], // cases cochées parmi optionsTipiDsa
    tipoDislessia: "", // sous-type, seulement si "Dislessia" est cochée
    adhd: "", // "Sì" / "No" / "Non desidero rispondere"
    tipoAdhd: "",
  });

  const maj = (cle, valeur) =>
    setReponses((prev) => ({ ...prev, [cle]: valeur }));

  // Réponse à la question DSA : si ce n'est plus "Sì", on efface les cases
  // cochées et le sous-type de dyslexie
  const majDsa = (valeur) =>
    setReponses((prev) => ({
      ...prev,
      dsa: valeur,
      dsaTipi: valeur === "Sì" ? prev.dsaTipi : [],
      tipoDislessia: valeur === "Sì" ? prev.tipoDislessia : "",
    }));

  // Coche / décoche un type de DSA ; décocher "Dislessia" efface son sous-type
  const basculerTipoDsa = (option) =>
    setReponses((prev) => {
      const dejaCoche = prev.dsaTipi.includes(option);
      return {
        ...prev,
        dsaTipi: dejaCoche
          ? prev.dsaTipi.filter((o) => o !== option)
          : [...prev.dsaTipi, option],
        tipoDislessia:
          option === "Dislessia" && dejaCoche ? "" : prev.tipoDislessia,
      };
    });

  // Réponse à la question ADHD : si ce n'est plus "Sì", on efface le sous-type
  const majAdhd = (valeur) =>
    setReponses((prev) => ({
      ...prev,
      adhd: valeur,
      tipoAdhd: valeur === "Sì" ? prev.tipoAdhd : "",
    }));

  // Date reconstruite au format "AAAA-MM-GG" (vide tant que les 3 menus ne sont pas remplis)
  const dateNaissance =
    reponses.giorno && reponses.mese && reponses.anno
      ? `${reponses.anno}-${reponses.mese}-${reponses.giorno}`
      : "";

  // Âge calculé automatiquement (null si la date est vide ou invalide)
  const age = calculerAge(dateNaissance);

  const dislessiaCochee = reponses.dsaTipi.includes("Dislessia");

  // Page 2 : exclusion automatique si l'italien n'est pas la langue maternelle
  const validerMadrelingua = () => {
    dureeMadrelingua.current = Date.now() - debutQuestion.current;
    if (madrelingua === "No") {
      setSousPage("exclu");
      return;
    }
    setSousPage("consentement");
  };

  // Page de consentement : sans consentement, la participation s'arrête ici.
  // Avec consentement : création du code participant, affiché sur la page suivante
  const validerConsentement = (reponse) => {
    consentement.current = reponse;
    if (reponse.consenso === "presta") {
      creerCodeEtEnregistrer();
    } else {
      setSousPage("refus");
    }
  };

  // Début du questionnaire : création du code participant
  const creerCodeEtEnregistrer = async () => {
    if (enCours) return; // évite un double clic
    setEnCours(true);
    try {
      const nouveauCode = await creerCodeUnique();
      setCode(nouveauCode);
      // La réponse sur la langue maternelle est enregistrée dès que le code existe
      enregistrerLignes([
        ligne({
          participant: nouveauCode,
          epreuve: EPREUVE,
          question: QUESTION_MADRELINGUA,
          reponse: madrelingua,
          duree_reponse: dureeMadrelingua.current,
        }),
        // Preuve du consentement : version de l'informativa, cases cochées,
        // temps passé sur la page (l'horodatage de la ligne donne la date)
        ...[
          ["versione_informativa", VERSION_INFORMATIVA],
          ["informativa_letta", consentement.current.informativaLetta ? 1 : 0],
          ["consenso_trattamento_dati", consentement.current.consenso],
        ].map(([question, reponse]) =>
          ligne({
            participant: nouveauCode,
            epreuve: "Consentement",
            question,
            reponse,
            duree_reponse: consentement.current.duree,
          })
        ),
      ]);
      setSousPage("code");
    } catch (err) {
      console.error(err);
      alert("Errore di connessione, riprova.");
    }
    setEnCours(false);
  };

  // Fin du questionnaire : transmission à App.jsx du code et de isDys
  // (1 si DSA ou ADHD déclaré avec diagnostic, 0 sinon)
  const validerQuestionnaire = () => {
    setParticipant(code);
    // isDys = 1 si un DSA (quel qu'il soit) ou un ADHD est déclaré avec diagnostic :
    // donne plus de temps dans Similitudes (30 s au lieu de 25 s)
    setIsDys(reponses.dsa === "Sì" || reponses.adhd === "Sì" ? 1 : 0);
    onComplete();
  };

  // ---------- Définition des questions ----------
  // Chaque question a un identifiant, une condition "répondu" et un rendu.
  // Les questions conditionnelles (types de DSA, dyslexie, ADHD) ne sont
  // ajoutées à la liste que si la réponse précédente est "Sì".
  const etapes = [
      {
      id: "ordi",
      complete: reponses.ordi !== "",
      rendu: (
        <GroupeRadio
          titre="Per questo questionario, utilizzerai: "
          nom="ordi"
          options={optionsOrdi}
          valeur={reponses.ordi}
          onChange={(v) => maj("ordi", v)}
        />
      ),
    },  
    {
      id: "genre",
      complete: reponses.genre !== "",
      rendu: (
        <GroupeRadio
          titre="Sei:"
          nom="genre"
          options={optionsGenre}
          valeur={reponses.genre}
          onChange={(v) => maj("genre", v)}
        />
      ),
    },
    {
      id: "naissance",
      complete: age !== null,
      rendu: (
        <>
          <TitreQuestion>Data di nascita:</TitreQuestion>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <select
              value={reponses.giorno}
              onChange={(e) => maj("giorno", e.target.value)}
              style={styleSelect}
            >
              <option value="">Giorno</option>
              {optionsGiorno.map((g) => (
                <option key={g} value={g}>
                  {Number(g)}
                </option>
              ))}
            </select>

            <select
              value={reponses.mese}
              onChange={(e) => maj("mese", e.target.value)}
              style={styleSelect}
            >
              <option value="">Mese</option>
              {optionsMese.map((nom, i) => (
                <option key={nom} value={String(i + 1).padStart(2, "0")}>
                  {nom}
                </option>
              ))}
            </select>

            <select
              value={reponses.anno}
              onChange={(e) => maj("anno", e.target.value)}
              style={styleSelect}
            >
              <option value="">Anno</option>
              {optionsAnno.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </>
      ),
    },
    {
      id: "annoCorso",
      complete: reponses.annoCorso !== "",
      rendu: (
        <GroupeRadio
          titre="Anno di corso attuale e livello di studi:"
          nom="annoCorso"
          options={optionsAnnoCorso}
          valeur={reponses.annoCorso}
          onChange={(v) => maj("annoCorso", v)}
        />
      ),
    },
    {
      id: "posizioneFrancese",
      complete: reponses.posizioneFrancese !== "",
      rendu: (
        <GroupeRadio
          titre="Posizione del francese nella classifica delle lingue studiate:"
          nom="posizioneFrancese"
          options={optionsPosizioneFrancese}
          valeur={reponses.posizioneFrancese}
          onChange={(v) => maj("posizioneFrancese", v)}
        />
      ),
    },
    {
      id: "anniFrancese",
      complete: reponses.anniFrancese !== "",
      rendu: (
        <>
          <TitreQuestion>
            Numero di anni di studio pregresso del francese:
          </TitreQuestion>
          <input
            className="champ-texte"
            type="number"
            min="1"
            step="1"
            placeholder="Es. 3"
            value={reponses.anniFrancese}
            onChange={(e) => maj("anniFrancese", e.target.value)}
            style={styleChamp}
          />
        </>
      ),
    },
    {
      id: "dsa",
      complete: reponses.dsa !== "",
      rendu: (
        <GroupeRadio
          titre="Hai una diagnosi ufficiale che confermi il tuo (i tuoi) DSA?"
          nom="dsa"
          options={optionsDiagnosi}
          valeur={reponses.dsa}
          onChange={majDsa}
        />
      ),
    },
    ...(reponses.dsa === "Sì"
      ? [
          {
            id: "dsaTipi",
            complete: reponses.dsaTipi.length > 0,
            rendu: (
              <GroupeCases
                titre="Quale/i DSA? (Puoi selezionare più opzioni)"
                options={optionsTipiDsa}
                valeurs={reponses.dsaTipi}
                onToggle={basculerTipoDsa}
              />
            ),
          },
        ]
      : []),
    ...(reponses.dsa === "Sì" && dislessiaCochee
      ? [
          {
            id: "tipoDislessia",
            complete: reponses.tipoDislessia !== "",
            rendu: (
              <GroupeRadio
                titre="Che tipo di dislessia?"
                nom="tipoDislessia"
                options={optionsTipoDislessia}
                valeur={reponses.tipoDislessia}
                onChange={(v) => maj("tipoDislessia", v)}
              />
            ),
          },
        ]
      : []),
    {
      id: "adhd",
      complete: reponses.adhd !== "",
      rendu: (
        <GroupeRadio
          titre="Hai una diagnosi ufficiale che confermi il tuo ADHD?"
          nom="adhd"
          options={optionsDiagnosi}
          valeur={reponses.adhd}
          onChange={majAdhd}
        />
      ),
    },
    ...(reponses.adhd === "Sì"
      ? [
          {
            id: "tipoAdhd",
            complete: reponses.tipoAdhd !== "",
            rendu: (
              <GroupeRadio
                titre="Che tipo di ADHD?"
                nom="tipoAdhd"
                options={optionsTipoAdhd}
                valeur={reponses.tipoAdhd}
                onChange={(v) => maj("tipoAdhd", v)}
              />
            ),
          },
        ]
      : []),
  ];

  // ---------- Rendu des pages ----------

  if (sousPage === 1) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h1><b>Benvenuto/a sul nostro questionario!</b></h1>

        <button onClick={() => setSousPage(2)} style={styleBoutonContinuer}>
          Inizia
        </button>
      </div>
    );
  }

  if (sousPage === 2) {
    return (
      <div style={stylePageQuestion}>
        <div style={styleBlocQuestion}>
          <GroupeRadio
            titre="Prima di cominciare, l'italiano è la tua madrelingua?"
            nom="madrelingua"
            options={optionsSiNo}
            valeur={madrelingua}
            onChange={setMadrelingua}
          />
        </div>

        <button
          onClick={validerMadrelingua}
          style={{
            ...styleBoutonContinuer,
            marginTop: "5svh",
            visibility: madrelingua ? "visible" : "hidden",
          }}
        >
          Conferma
        </button>
      </div>
    );
  }

  if (sousPage === "consentement") {
    return <Consentement onConfirme={validerConsentement} />;
  }

  if (sousPage === "code") {
    return (
      <div className="instructions">
        <h2>Grazie! Ecco il tuo codice di partecipazione:</h2>

        <div
          style={{
            fontSize: "clamp(32px, 8svh, 60px)",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            margin: "2svh auto",
            padding: "1svh 3vw",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            userSelect: "all", // un clic sélectionne tout le code
          }}
        >
          {code}
        </div>

        <h2 style={{ maxWidth: "min(90vw, 900px)", margin: "0 auto", textWrap: "pretty" }}>
          Annotalo e conservalo. Le tue risposte sono anonime: questo codice è
          l’unico modo per ritrovarle. Ti servirà solo se, in qualsiasi momento,
          vorrai revocare il tuo consenso e chiedere la cancellazione dei tuoi
          dati: in quel caso scrivi a{" "}
          <a href="mailto:magali.dillenseger@unito.it?subject=Diritti%20privacy">
            magali.dillenseger@unito.it
          </a>{" "}
          con oggetto “Diritti privacy”, indicando questo codice.
        </h2>

        <button onClick={() => setSousPage(3)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  if (sousPage === "refus") {
    return (
      <div className="instructions">
        <h2>
          Grazie per il tuo interesse. Senza il tuo consenso al trattamento dei
          dati personali non è possibile partecipare alla ricerca.
        </h2>
        <button
          onClick={() => setSousPage("consentement")}
          style={styleBoutonContinuer}
        >
          Torna all’informativa
        </button>
      </div>
    );
  }

  if (sousPage === 3) {
    return (
      <div className="instructions">
        <h2 style={{ textWrap: "pretty" }}>
          In questo test dovrai prima rispondere ad alcune domande su di te,
          poi alternerai domande sulle strategie di apprendimento con prove di
          italiano e di francese, e un test cognitivo.
        </h2>
        <h2>Si parte!</h2>

        <BoutonAudio fichier="contenu_test.mp3" />
        <button onClick={() => setSousPage(4)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  if (sousPage === 4) {
    const indexSafe = Math.min(etape, etapes.length - 1);
    const etapeActuelle = etapes[indexSafe];
    const derniere = indexSafe === etapes.length - 1;

    // Valeur enregistrée pour l'étape affichée
    const valeurEtape = (id) => {
      if (id === "naissance") return dateNaissance;
      if (id === "dsaTipi") return reponses.dsaTipi.join(" ; ");
      return reponses[id];
    };

    const confirmer = () => {
      const maintenant = Date.now();
      const dureeTotale = derniere ? maintenant - debutAccueil.current : null;

      enregistrerLignes([
        ligne({
          participant: code,
          epreuve: EPREUVE,
          question: LIBELLES[etapeActuelle.id] ?? etapeActuelle.id,
          reponse: valeurEtape(etapeActuelle.id),
          duree_reponse: maintenant - debutQuestion.current,
          duree_totale_epreuve: dureeTotale,
        }),
      ]).then(() => {
        if (derniere) enregistrerDureeTotale(code, EPREUVE, dureeTotale);
      });

      if (derniere) {
        validerQuestionnaire();
      } else {
        setEtape(indexSafe + 1);
      }
    };

    return (
      <div style={stylePageQuestion}>
        <div style={styleBlocQuestion}>{etapeActuelle.rendu}</div>

        <button
          onClick={confirmer}
          disabled={enCours}
          style={{
            ...styleBoutonContinuer,
            marginTop: "5svh",
            visibility: etapeActuelle.complete ? "visible" : "hidden",
            opacity: enCours ? 0.5 : 1,
            cursor: enCours ? "not-allowed" : "pointer",
          }}
        >
          Conferma
        </button>
      </div>
    );
  }

  if (sousPage === "exclu") {
    return (
      <div className="instructions">
        <h2>
          Grazie per il tuo interesse. Purtroppo questo esperimento è riservato
          a persone di madrelingua italiana, quindi non puoi partecipare.
        </h2>
      </div>
    );
  }

  return null;
}
