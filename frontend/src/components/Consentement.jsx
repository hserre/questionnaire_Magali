import React, { useRef, useState } from "react";
import { styleBoutonContinuer } from "./InterfaceUtils";

// Une page de document (Foglio informativo, Modulo del consenso, Informativa) :
// le texte dans une zone défilante, la phrase finale du document, puis
// éventuellement une case à cocher obligatoire, et le bouton "Continua".
// onContinua({ duree }) est appelé au clic sur "Continua".
// Le composant est remonté à chaque document (key dans Bienvenue.jsx).

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

export default function Consentement({ documento, onContinua }) {
  const debut = useRef(Date.now());
  const [accettato, setAccettato] = useState(false);

  const pronto = !documento.casella || accettato;

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
          .documento p, .documento li {
            font-size: inherit;
            line-height: inherit;
            margin: 0 0 0.8em 0;
            text-align: justify;
          }
          .documento h3 { text-align: center; margin: 0 0 1.2em 0; font-size: 1.15em; }
          .documento ul { margin: 0 0 0.8em 0; padding-left: 1.6em; }
          .documento .retrait { margin-left: 2em; }
          .documento-finale { font-size: clamp(14px, 2svh, 18px); line-height: 1.5; text-align: left; }
        `}</style>

        {/* Texte du document : zone défilante pour que le bouton reste visible */}
        <div
          className="documento"
          style={{
            height: documento.casella ? "50svh" : "60svh",
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "2svh 2vw",
            backgroundColor: "white",
            textAlign: "left",
            fontSize: "clamp(13px, 1.9svh, 17px)",
            lineHeight: 1.5,
          }}
          dangerouslySetInnerHTML={{ __html: documento.html }}
        />

        <p style={{ fontSize: "clamp(13px, 1.8svh, 16px)", margin: "1svh 0 2svh 0", textAlign: "left" }}>
          <a href={documento.pdf} target="_blank" rel="noopener noreferrer">
            Scarica il documento (PDF)
          </a>
        </p>

        {documento.finale && (
          <p
            className="documento-finale"
            style={{ margin: "0 0 2svh 0" }}
            dangerouslySetInnerHTML={{ __html: documento.finale }}
          />
        )}

        {documento.casella && (
          <label style={styleLabel}>
            <input
              type="checkbox"
              checked={accettato}
              onChange={(e) => setAccettato(e.target.checked)}
              style={styleCase}
            />
            <span>
              <b>{documento.casella}</b>
            </span>
          </label>
        )}

        <button
          onClick={() => onContinua({ duree: Date.now() - debut.current })}
          disabled={!pronto}
          tabIndex={pronto ? 0 : -1}
          aria-hidden={!pronto}
          style={{
            ...styleBoutonContinuer,
            marginTop: "3svh",
            visibility: pronto ? "visible" : "hidden",
          }}
        >
          Continua
        </button>
      </div>
    </div>
  );
}
