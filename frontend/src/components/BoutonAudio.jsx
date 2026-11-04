import React, { useEffect, useRef, useState } from "react";

// Bouton qui lit / met en pause l'audio des consignes de la page.
// Les fichiers sont dans frontend/public/audios_consignes/.
// Si le fichier n'existe pas, le bouton ne s'affiche pas.
// L'audio s'arrête quand on quitte la page.
export default function BoutonAudio({ fichier }) {
  const audioRef = useRef(null);
  const [enLecture, setEnLecture] = useState(false);
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    const audio = new Audio(`/audios_consignes/${fichier}`);
    audio.preload = "auto";
    audio.onplay = () => setEnLecture(true);
    audio.onpause = () => setEnLecture(false);
    audio.onended = () => setEnLecture(false);
    audio.onerror = () => setDisponible(false);
    audioRef.current = audio;
    setDisponible(true);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [fichier]);

  if (!disponible) return null;

  const basculer = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err) => console.error("Lecture audio impossible :", err));
    } else {
      audio.pause();
    }
  };

  return (
    <button type="button" onClick={basculer} style={styleBoutonAudio} aria-pressed={enLecture}>
      {enLecture ? "⏸ Pausa" : "🔊 Ascolta le istruzioni"}
    </button>
  );
}

const styleBoutonAudio = {
  backgroundColor: "rgb(230,230,250)",
  color: "#2b1f66",
  padding: "8px 24px",
  fontSize: "18px",
  borderRadius: "999px",
  border: "1px solid #5b3cc4",
  cursor: "pointer",
  display: "block",
  margin: "2svh auto 0 auto",
};
