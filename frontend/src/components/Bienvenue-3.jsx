import React, { useState } from "react";
import { styleBoutonContinuer } from "./InterfaceUtils";

const styleTitreQuestion = { fontSize: "40px", marginBottom: "1svh" };

const styleChamp = {
  width: "80%",
  padding: "2svh",
  marginTop: "1svh",
  marginBottom: "4svh",
  fontSize: "16px",
};

const styleSelect = {
  padding: "2svh",
  fontSize: "16px",
  marginTop: "1svh",
  marginBottom: "4svh",
};

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

const optionsTipoDislessia = ["Profonda", "Di superficie", "Preferisco non indicarlo"];

const optionsTipoAdhd = [
  "Con iperattività",
  "Senza iperattività",
  "Preferisco non rispondere",
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

const styleLabel = {
  fontSize: "3svh",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "1svw",
};

const styleCase = { width: "3svh", height: "3svh", cursor: "pointer" };

const styleListe = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "fit-content",
  margin: "0 auto",
  gap: "1.5svh",
};

// Un seul choix possible
function GroupeRadio({ titre, nom, options, valeur, onChange }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "4svh" }}>
      <p style={{ fontSize: "4svh", marginBottom: "3svh" }}>{titre}</p>
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
    </div>
  );
}

export default function Bienvenue({ onComplete, setIsDys }) {
  // 1 = accueil + langue maternelle, 2 = introduction,
  // 3 = questionnaire, "exclu" = non éligible
  const [sousPage, setSousPage] = useState(1);

  const [madrelingua, setMadrelingua] = useState("");

  const [reponses, setReponses] = useState({
    genre: "",
    giorno: "",
    mese: "",
    anno: "",
    annoCorso: "",
    posizioneFrancese: "",
    anniFrancese: "",
    dislessia: "",
    tipoDislessia: "",
    adhd: "",
    tipoAdhd: "",
  });

  const maj = (cle, valeur) =>
    setReponses((prev) => ({ ...prev, [cle]: valeur }));

  // Réponse oui/non + question de suivi : si la réponse n'est plus "Sì",
  // on efface la réponse à la question de suivi
  const majAvecSuivi = (cle, cleSuivi, valeur) =>
    setReponses((prev) => ({
      ...prev,
      [cle]: valeur,
      [cleSuivi]: valeur === "Sì" ? prev[cleSuivi] : "",
    }));

  // Date reconstruite au format "AAAA-MM-GG" (vide tant que les 3 menus ne sont pas remplis)
  const dateNaissance =
    reponses.giorno && reponses.mese && reponses.anno
      ? `${reponses.anno}-${reponses.mese}-${reponses.giorno}`
      : "";

  // Âge calculé automatiquement (null si la date est vide ou invalide)
  const age = calculerAge(dateNaissance);

  // Une question de suivi est obligatoire seulement si la réponse est "Sì"
  const dislessiaComplete =
    reponses.dislessia === "No" ||
    (reponses.dislessia === "Sì" && reponses.tipoDislessia);

  const adhdComplete =
    reponses.adhd === "No" || (reponses.adhd === "Sì" && reponses.tipoAdhd);

  // Tout est obligatoire
  const questionnaireComplet =
    reponses.genre &&
    age !== null &&
    reponses.annoCorso &&
    reponses.posizioneFrancese &&
    reponses.anniFrancese !== "" &&
    dislessiaComplete &&
    adhdComplete;

  // Page 1 : exclusion automatique si l'italien n'est pas la langue maternelle
  const validerMadrelingua = () => {
    if (madrelingua === "No") {
      setSousPage("exclu");
      return;
    }
    setSousPage(2);
  };

  // Fin du questionnaire : on transmet isDys à App.jsx (1 si dyslexique, 0 sinon)
  const validerQuestionnaire = () => {
    setIsDys(reponses.dislessia === "Sì" ? 1 : 0);
    onComplete();
  };

  if (sousPage === 1) {
    return (
      <div>
        <h1>Benvenuto/a sul nostro questionario!</h1>

        <h2 style={{ fontSize: 40 }}>Prima di cominciare:</h2>

        <GroupeRadio
          titre="Madrelingua italiano:"
          nom="madrelingua"
          options={optionsSiNo}
          valeur={madrelingua}
          onChange={setMadrelingua}
        />

        <button
          onClick={validerMadrelingua}
          disabled={!madrelingua}
          style={{
            ...styleBoutonContinuer,
            opacity: madrelingua ? 1 : 0.5,
            cursor: madrelingua ? "pointer" : "not-allowed",
          }}
        >
          Conferma
        </button>
      </div>
    );
  }

  if (sousPage === 2) {
    return (
      <div>
        <h2 style={{ fontSize: 40 }}>
          In questo test dovrai prima rispondere ad alcune domande su di te,
          poi alternerai domande sulle tue strategie di apprendimento, prove di
          italiano e francese e un test cognitivo. Si parte!
        </h2>

        <button onClick={() => setSousPage(3)} style={styleBoutonContinuer}>
          Conferma
        </button>
      </div>
    );
  }

  if (sousPage === 3) {
    return (
      <div>
        <h2 style={{ fontSize: 40 }}>
          Per cominciare, abbiamo alcune domande:
        </h2>

        <GroupeRadio
          titre="Sei:"
          nom="genre"
          options={optionsGenre}
          valeur={reponses.genre}
          onChange={(v) => maj("genre", v)}
        />

        <h2 style={styleTitreQuestion}>Data di nascita</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2svw",
            flexWrap: "wrap",
          }}
        >
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

        <GroupeRadio
          titre="Anno di corso attuale e livello di studi:"
          nom="annoCorso"
          options={optionsAnnoCorso}
          valeur={reponses.annoCorso}
          onChange={(v) => maj("annoCorso", v)}
        />

        <GroupeRadio
          titre="Posizione del francese nella classifica delle lingue studiate:"
          nom="posizioneFrancese"
          options={optionsPosizioneFrancese}
          valeur={reponses.posizioneFrancese}
          onChange={(v) => maj("posizioneFrancese", v)}
        />

        <h2 style={styleTitreQuestion}>
          Eventuale numero di anni di studio pregresso del francese:
        </h2>
        <input
          className="champ-texte"
          type="number"
          min="0"
          step="0.5"
          placeholder="Es. 3"
          value={reponses.anniFrancese}
          onChange={(e) => maj("anniFrancese", e.target.value)}
          style={styleChamp}
        />

        <GroupeRadio
          titre="Sei dislessico/a?"
          nom="dislessia"
          options={optionsSiNo}
          valeur={reponses.dislessia}
          onChange={(v) => majAvecSuivi("dislessia", "tipoDislessia", v)}
        />

        {reponses.dislessia === "Sì" && (
          <GroupeRadio
            titre="Che tipo di dislessia hai?"
            nom="tipoDislessia"
            options={optionsTipoDislessia}
            valeur={reponses.tipoDislessia}
            onChange={(v) => maj("tipoDislessia", v)}
          />
        )}

        <GroupeRadio
          titre="Hai l'ADHD (disturbo da deficit di attenzione/iperattività)?"
          nom="adhd"
          options={optionsSiNo}
          valeur={reponses.adhd}
          onChange={(v) => majAvecSuivi("adhd", "tipoAdhd", v)}
        />

        {reponses.adhd === "Sì" && (
          <GroupeRadio
            titre="Quale tipo di ADHD hai?"
            nom="tipoAdhd"
            options={optionsTipoAdhd}
            valeur={reponses.tipoAdhd}
            onChange={(v) => maj("tipoAdhd", v)}
          />
        )}

        <button
          onClick={validerQuestionnaire}
          disabled={!questionnaireComplet}
          style={{
            ...styleBoutonContinuer,
            opacity: questionnaireComplet ? 1 : 0.5,
            cursor: questionnaireComplet ? "pointer" : "not-allowed",
          }}
        >
          Conferma
        </button>
      </div>
    );
  }

  if (sousPage === "exclu") {
    return (
      <div>
        <h2 style={{ fontSize: 40 }}>
          Grazie per il tuo interesse. Purtroppo questo esperimento è riservato
          a persone di madrelingua italiana, quindi non puoi partecipare.
        </h2>
      </div>
    );
  }

  return null;
}
