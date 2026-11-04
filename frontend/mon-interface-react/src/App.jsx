import { useState } from 'react';

function App() {
  // Variables d'état (pour stocker ce que l'utilisateur tape et la réponse du serveur)
  const [saisie, setSaisie] = useState('');
  const [messageServeur, setMessageServeur] = useState('');

  // Fonction appelée lors de la soumission du formulaire (Touche Entrée ou clic sur Valider)
  const soumettreCode = async (e) => {
    e.preventDefault(); // Empêche la page de se recharger

    if (!saisie.trim()) return; // Si c'est vide, on fait rien

    try {
      // On envoie le code à FastAPI via une requête POST
      const reponse = await fetch('http://127.0.0.1:8001/connexion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code_participant: saisie }),
      });

      const donnees = await reponse.json();
      
      // On stocke la réponse du serveur pour l'afficher à l'écran
      setMessageServeur(donnees.message);
      setSaisie(''); // On vide le champ de texte
    } catch (error) {
      console.error("Erreur de connexion :", error);
      setMessageServeur("Impossible de joindre le serveur FastAPI.");
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ 
        padding: '30px', 
        borderRadius: '10px', 
        backgroundColor: '#fff', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h2>Entrez votre code de participant</h2>
        
        {/* Le formulaire intercepte automatiquement la touche "Entrée" */}
        <form onSubmit={soumettreCode}>
          <input
            type="text"
            placeholder="Ex: PART-01"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)} // Met à jour la variable à chaque lettre tapée
            style={{
              padding: '10px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              width: '200px',
              marginRight: '10px',
              outline: 'none'
            }}
          />
          <button type="submit" style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007BFF',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            Valider
          </button>
        </form>

        {/* Si le serveur a répondu, on affiche son message ici */}
        {messageServeur && (
          <p style={{ marginTop: '20px', color: '#28a745', fontWeight: 'bold' }}>
            {messageServeur}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;