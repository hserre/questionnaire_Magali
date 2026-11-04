import React, { useRef, useState } from "react";
import { styleBoutonContinuer } from "./InterfaceUtils";
import { INFORMATIVA_HTML } from "./informativaConsenso";

// Page de consentement, affichée après la question sur la langue maternelle.
// Reprend les trois cases du formulaire papier :
//  1. avoir lu et compris l'informativa (case à cocher, obligatoire)
//  2. "presta" / "non presta" il consenso (choix exclusif, obligatoire)
// onConfirme({ informativaLetta, consenso, duree }) est appelé au clic sur "Conferma".

const OPZIONI_CONSENSO = [
  {
    valeur: "presta",
    texte: (
      <>
        presto il mio <b>consenso</b> al trattamento dei miei dati personali per le
        finalità e con le modalità descritte nella presente informativa
      </>
    ),
  },
  {
    valeur: "non_presta",
    texte: (
      <>
        <b>non</b> presto il mio <b>consenso</b> al trattamento dei miei dati personali
        per le finalità e con le modalità descritte nella presente informativa
      </>
    ),
  },
];

const styleCase = {
  width: "clamp(22px, 3svh, 30px)",
  height: "clamp(22px, 3svh, 30px)",
  cursor: "pointer",
  flexShrink: 0,
  marginTop: "0.2em",
};

const styleLabel = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  fontSize: "clamp(15px, 2.2svh, 20px)",
  lineHeight: 1.4,
  cursor: "pointer",
  textAlign: "left",
};

export default function Consentement({ onConfirme }) {
  const debut = useRef(Date.now());
  const [informativaLetta, setInformativaLetta] = useState(false);
  const [consenso, setConsenso] = useState("");

  const complet = informativaLetta && consenso !== "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100svh",
        boxSizing: "border-box",
        padding: "3svh 5vw",
      }}
    >
      <div style={{ width: "min(90vw, 900px)" }}>
        {/* Les styles globaux (index.css) agrandissent p et h2 : on les neutralise ici */}
        <style>{`
          .informativa p, .informativa li {
            font-size: inherit;
            line-height: inherit;
            margin: 0 0 0.8em 0;
            text-align: left;
          }
          .informativa ul, .informativa ol { margin: 0 0 0.8em 0; padding-left: 1.6em; }
        `}</style>

        {/* Informativa : zone défilante pour que les cases restent visibles */}
        <div
          className="informativa"
          style={{
            height: "50svh",
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "2svh 2vw",
            backgroundColor: "white",
            textAlign: "left",
            fontSize: "clamp(13px, 1.9svh, 17px)",
            lineHeight: 1.5,
          }}
          dangerouslySetInnerHTML={{ __html: INFORMATIVA_HTML }}
        />

        <p style={{ fontSize: "clamp(13px, 1.8svh, 16px)", margin: "1svh 0 3svh 0" }}>
          <a href="/formulaireConsentement.pdf" target="_blank" rel="noopener noreferrer">
            Scarica l’informativa (PDF)
          </a>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2svh" }}>
          <label style={styleLabel}>
            <input
              type="checkbox"
              checked={informativaLetta}
              onChange={(e) => setInformativaLetta(e.target.checked)}
              style={styleCase}
            />
            <span>
              <b>
                Ho preso visione e compreso l’informativa al trattamento dei dati
                personali e aderisco in modo libero e volontario alla ricerca.
              </b>
            </span>
          </label>

          {OPZIONI_CONSENSO.map((o) => (
            <label key={o.valeur} style={styleLabel}>
              <input
                type="radio"
                name="consenso"
                value={o.valeur}
                checked={consenso === o.valeur}
                onChange={() => setConsenso(o.valeur)}
                style={styleCase}
              />
              <span>{o.texte}</span>
            </label>
          ))}
        </div>

        <button
          onClick={() =>
            onConfirme({
              informativaLetta,
              consenso,
              duree: Date.now() - debut.current,
            })
          }
          disabled={!complet}
          tabIndex={complet ? 0 : -1}
          aria-hidden={!complet}
          style={{
            ...styleBoutonContinuer,
            marginTop: "4svh",
            visibility: complet ? "visible" : "hidden",
          }}
        >
          Conferma
        </button>
      </div>
    </div>
  );
}
