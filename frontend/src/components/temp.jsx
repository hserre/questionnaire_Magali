import React, { useState } from "react";
import { styleBoutonContinuer } from "./InterfaceUtils";
import { API_URL } from "../config";

const styleTitreQuestion = { fontSize: "40px", marginBottom: "1svh" };

const styleChamp = {
  width: "80%",
  padding: "2svh",
  marginTop: "1svh",
  marginBottom: "4svh",
  fontSize: "16px",
};

const optionsGenre = [
  "Una donna",
  "Un uomo",
  "Altro",
  "Preferisco non rispondere",
];

const optionsDislessia = ["Sì", "No"];

const optionsFrancese = [
  "è la tua lingua madre",
  "è la tua seconda lingua",
  "è la tua terza lingua",
  "è la tua quarta lingua",
  "altra",
];

// Défini en dehors du composant principal pour ne pas être recréé à chaque rendu
function GroupeRadio({ titre, nom, options, valeur, onChange }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "4svh" }}>
      <p style={{ fontSize: "4svh", marginBottom: "3svh" }}>{titre}</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "fit-content",
          margin: "0 auto",
          gap: "1.5svh",
        }}
      >
        {options.map((option) => (
          <label
            key={option}
            style={{
              fontSize: "3svh",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "1svw",
            }}
          >
            <input
              type="radio"
              name={nom}
              value={option}
              checked={valeur === option}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: "3svh", height: "3svh", cursor: "pointer" }}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Bienvenue({ onComplete, setIsInBase, setParticipant }) {
  const [sousPage, setSousPage] = useState(1);

  // Un seul objet : une clé par réponse
  const [reponses, setReponses] = useState({
    naissance: "",
    genre: "",
    dislessia: "",
    tipoDislessia: "",
    universita: "",
    linguaMadre: "",
    francese: "",
    anniFrancese: "",
  });

  const [username, setUsername] = useState("");

  const maj = (cle, valeur) =>
    setReponses((prev) => ({ ...prev, [cle]: valeur }));

  // Le type de dyslexie n'est demandé que si la personne répond "Sì"
  const dislessicoSi = reponses.dislessia === "Sì";

  const page2Complete =
    reponses.naissance.trim() &&
    reponses.genre &&
    reponses.dislessia &&
    (!dislessicoSi || reponses.tipoDislessia.trim()) &&
    reponses.universita.trim() &&
    reponses.linguaMadre.trim() &&
    reponses.francese &&
    reponses.anniFrancese.trim();

const handleValidation = async () => {
    const code = username.trim();

      if (!code) {
          alert("Ops, hai dimenticato di inserire il tuo codice!");
          return;
      }

      setParticipant(code);

      try {
          const res = await fetch(
              `${API_URL}/api/check_code?code=${encodeURIComponent(code)}`
          );
          const data = await res.json();

          if (data.existe) {
              setIsInBase(1);
              setSousPage(4);
              return;
          }

          // Code absent : on l'ajoute
          await fetch(`${API_URL}/api/add_code`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userName:code }),
          });

          setSousPage(2);
      } catch (err) {
          console.error(err);
          alert("Errore di connessione, riprova.");
      }
  };

  if (sousPage === 1) {
    return (
    <div>
      <h2 style={{ fontSize: 40 }}>
        Se è la prima volta che partecipi all'esperimento, crea un codice che ti consentirà di accedere alla
        seconda sessione domani. Conservalo con cura. Se hai già completato la prima parte dell'esperimento,
        inserisci nuovamente il tuo codice per accedere alla seconda sessione.
      </h2>

      <input
        className="champ-texte"
        type="text"
        placeholder="Inserisci il tuo codice qui sotto e poi clicca su “Conferma”"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={styleChamp}
      />

      <button
        onClick={handleValidation}
        style={styleBoutonContinuer}
      >
        Conferma
      </button>
    </div>
  );
}

  if (sousPage === 2) {
    return (
      <div>
        <h1>Benvenuto/a nella nostra esperienza!</h1>

        <h2 style={{ fontSize: 40 }}>
          Per cominciare, abbiamo alcune domande:
        </h2>

        <h2 style={styleTitreQuestion}>Quando sei nato/a?</h2>
        <input
          className="champ-texte"
          type="text"
          placeholder="data di nascita"
          value={reponses.naissance}
          onChange={(e) => maj("naissance", e.target.value)}
          style={styleChamp}
        />

        <GroupeRadio
          titre="Sei:"
          nom="genre"
          options={optionsGenre}
          valeur={reponses.genre}
          onChange={(v) => maj("genre", v)}
        />

        <GroupeRadio
          titre="Sei dislessico/a?"
          nom="dislessia"
          options={optionsDislessia}
          valeur={reponses.dislessia}
          onChange={(v) => maj("dislessia", v)}
        />

        {dislessicoSi && (
          <>
            <h2 style={styleTitreQuestion}>
              Di che tipo di dislessia soffri?
            </h2>
            <input
              className="champ-texte"
              type="text"
              placeholder="Tipo di dislessia"
              value={reponses.tipoDislessia}
              onChange={(e) => maj("tipoDislessia", e.target.value)}
              style={styleChamp}
            />
          </>
        )}

        <h2 style={styleTitreQuestion}>In quale università studi?</h2>
        <input
          className="champ-texte"
          type="text"
          placeholder="Università"
          value={reponses.universita}
          onChange={(e) => maj("universita", e.target.value)}
          style={styleChamp}
        />

        <h2 style={styleTitreQuestion}>Qual è la tua lingua madre?</h2>
        <input
          className="champ-texte"
          type="text"
          placeholder="Lingua madre"
          value={reponses.linguaMadre}
          onChange={(e) => maj("linguaMadre", e.target.value)}
          style={styleChamp}
        />

        <GroupeRadio
          titre="Il francese:"
          nom="francese"
          options={optionsFrancese}
          valeur={reponses.francese}
          onChange={(v) => maj("francese", v)}
        />

        <h2 style={styleTitreQuestion}>Da quanto tempo studi il francese?</h2>
        <input
          className="champ-texte"
          type="text"
          placeholder="Es. 3 anni"
          value={reponses.anniFrancese}
          onChange={(e) => maj("anniFrancese", e.target.value)}
          style={styleChamp}
        />

        <button
          onClick={() => setSousPage(3)}
          disabled={!page2Complete}
          style={{
            ...styleBoutonContinuer,
            opacity: page2Complete ? 1 : 0.5,
            cursor: page2Complete ? "pointer" : "not-allowed",
          }}
        >
          Conferma
        </button>
      </div>
    );
  }

    if (sousPage === 3) {
    return (
    <div>
      <h2 style={{ fontSize: 40 }}>
        Questo test si svolge in due parti: una prima parte sulle tue competenze
        linguistiche sia in italiano sia in francese, una seconda parte sulle
        strategie di apprendimento che adoperi. Prima di iniziare, ti chiediamo
        di creare e salvare un username che utilizzerai in un secondo momento
        per svolgere la seconda parte dell'esperienza, dopodiché sarai
        reindirizzato/a verso la prima parte. Si comincia!
      </h2>

      <button onClick={onComplete} style={styleBoutonContinuer}>
      Conferma
      </button>
      </div>
  );
}

    if (sousPage === 4) {
    return (
    <div>
      <h2 style={{ fontSize: 40 }}>
        Passiamo alla seconda parte. Dovrai completare due test di selezione e poi rispondere a un sondaggio
        sulle tue abitudini di studio. Si parte!
      </h2>

      <button onClick={onComplete} style={styleBoutonContinuer}>
      Conferma
      </button>
      </div>
  );
}
}


