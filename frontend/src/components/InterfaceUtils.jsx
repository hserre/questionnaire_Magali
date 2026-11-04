
// 1. COMPOSANT DE LA BOÎTE FLOTTANTE (Sous les boutons)
export function BoiteFlottante({ texte }) {
  return (
    <div style={{
      position: "absolute",
      top: "105%", // S'affiche juste sous le bouton
      left: "50%",
      transform: "translateX(-50%)", // Parfaitement centré sous le bouton
      zIndex: 10,
      backgroundColor: "#b3ffb3",
      color: "#111",
      padding: "10px",
      borderRadius: "10px",
      width: "160px",
      textAlign: "center",
      fontSize: "15px",
      boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
    }}>
      {texte}
    </div>
  );
}

// 2. COMPOSANT DE LA CROIX PRINCIPALE (Équivalent de afficher_interface_croix)
export function InterfaceCroix({ 
  motCentral, 
  defin, 
  transla, 
  ex, 
  clicksAdd, 
  infoAAfficher, 
  onClicBouton 
}) {
  
  const styleBoutonVert = (estClique) => ({
    backgroundColor: "#52BE70",
    color: "white",
    border: estClique ? "4px solid black" : "none",
    padding: "16px 32px", // Augmenté pour des boutons plus massifs
    fontSize: "22px",      // Texte un poil plus grand
    fontWeight: "bold",
    borderRadius: "8px",
    width: "100%",
    cursor: "pointer",
    position: "relative",
    boxShadow: "0px 6px 15px rgba(0,0,0,0.15)",
    transition: "all 0.2s ease"
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between", // Distribue l'espace verticalement
      margin: "0 auto",
      maxWidth: "900px",  // Élargi pour que les boutons latéraux respirent
      width: "100%",
      minHeight: "65vh",  // Force le composant à prendre 65% de la hauteur de l'écran
      padding: "20px 0"
    }}>
      
      {/* Ligne 1 : HAUT (Traduction) */}
      {/* margin-bottom: auto va pousser cette ligne vers le haut et le milieu vers le bas */}
      <div style={{ width: "250px", position: "relative", marginBottom: "auto" }}>
        <button 
          onClick={() => onClicBouton("Traduction")}
          style={styleBoutonVert(clicksAdd.Traduction)}
        >
          Traduction {clicksAdd.Traduction && "✓"}
        </button>
        {infoAAfficher === "Traduction" && <BoiteFlottante texte={transla} />}
      </div>

      {/* Ligne 2 : MILIEU (Définition - MOT - Exemple) */}
      {/* Cette ligne reste pile au centre vertical grâce aux margin auto des lignes haut/bas */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        width: "100%",
        gap: "40px", // Plus d'espace entre les boutons et le mot
        marginTop: "40px",
        marginBottom: "40px"
      }}>
        {/* À gauche : Définition */}
        <div style={{ flex: 1, position: "relative" }}>
          <button 
            onClick={() => onClicBouton("Définition")}
            style={styleBoutonVert(clicksAdd.Définition)}
          >
            Définition {clicksAdd.Définition && "✓"}
          </button>
          {infoAAfficher === "Définition" && <BoiteFlottante texte={defin} />}
        </div>

        {/* Au centre : Le Mot de l'exercice */}
        <div style={{
          fontSize: "40px", // Plus grand pour être le point focal
          fontWeight: "bold",
          fontStyle: "italic",
          color: "#111",
          minWidth: "180px",
          textAlign: "center"
        }}>
          {motCentral}
        </div>

        {/* À droite : Exemple */}
        <div style={{ flex: 1, position: "relative" }}>
          <button 
            onClick={() => onClicBouton("Exemple")}
            style={styleBoutonVert(clicksAdd.Exemple)}
          >
            Exemple {clicksAdd.Exemple && "✓"}
          </button>
          {infoAAfficher === "Exemple" && <BoiteFlottante texte={ex} />}
        </div>
      </div>

      {/* Ligne 3 : BAS (Prononciation) */}
      {/* margin-top: auto repousse cette ligne tout en bas */}
      <div style={{ width: "250px", position: "relative", marginTop: "auto" }}>
        <button 
          onClick={() => onClicBouton("Prononciation")}
          style={styleBoutonVert(clicksAdd.Prononciation)}
        >
          Prononciation {clicksAdd.Prononciation && "✓"}
        </button>
        
        {infoAAfficher === "Prononciation" && (
          <audio 
            src={`https://reforest-thinning-spoiled.ngrok-free.dev/Entry_data/audio_all/${motCentral}.mp3`}
            autoPlay 
            style={{ display: "none" }} 
          />
        )}
      </div>

    </div>
  );
}

// Petit style réutilisable pour le bouton continuer blanc/gris du bas de page
export const styleBoutonContinuer = {
    backgroundColor: "white",
    color: "black",
    padding: "3svh 4svw",
    fontSize: "3svh",
    borderRadius: "3svh",
    border: "2px solid #ccc",
    cursor: "pointer",
    display: "block",
    margin: "3svh auto 0 auto",
    width: "auto"
};