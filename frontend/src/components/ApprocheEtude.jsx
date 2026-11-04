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

export default function StrategiesEtude2({ participant, onComplete }) {
  const items3Source = [
    "Prima di iniziare a studiare passo in rassegna tutte le cose che devo fare",
    "Ho l’abitudine di controllare se veramente ho capito ciò che ho studiato, ponendomi delle domande o facendo esercizi",
    "In genere le valutazioni che mi danno i docenti corrispondono a quelle che io stesso/a mi assegno",
    "Mentre faccio degli esercizi evito di controllare se sto procedendo bene",
    "Anche se devo prepararmi per un’interrogazione / un esame impegnativi, tendo a rimandare il più possibile il momento dello studio",
    "Quando studio cerco di ripetere parola per parola quello che è scritto nel testo",
    "Cerco di prevedere il tipo di compito / esame che mi aspetta",
    "Durante la spiegazione del docente, amo fare dei collegamenti",
    "Quando preparo un compito o un’interrogazione / un esame cerco di prevedere quali domande potrebbe farmi il docente",
    "Durante lo studio personale dedico sempre una parte del tempo a verificare quanto so",
    "Faccio molta attenzione quando i docenti interrogano / fanno gli esami, per capire cosa pretendono",
    "Mentre il docente parla, mi faccio delle annotazioni per ricordare e capire meglio",
    "Mi è capitato più di una volta di essermi accorto/a solo all’ultimo momento di una verifica / un esame importante",
    "Mi è capitato più di una volta di prendere un brutto voto che non mi attendevo",
    "Quando non ho studiato abbastanza, ne sono consapevole",
    "Mi piace soffermarmi a pensare a come la mia mente lavora",
    "Quando non ricordo qualcosa che avevo studiato, cerco di capire per quali ragioni ho dimenticato",
    "Mi piace trovare una spiegazione al fatto che certe volte ricordo e altre no",
    "Nello studio bisogna concentrarsi senza perdere tempo a domandarsi che cosa è più facile e cosa è più difficile",
    "Non mi pare importante raccogliere informazioni sulle modalità di svolgimento delle prove / esami",
    "Mentre studio mi rendo conto subito delle cose che non ho capito bene",
    "Mi capita di trovarmi all’ultimo momento con molto materiale da fare / studiare",
    "Non presto particolare attenzione alle osservazioni dei docenti quando interrogano i miei compagni",
    "Non riesco a capire di aver sbagliato",
    "Non riesco quasi mai a prevedere come andranno le mie interrogazioni / prove / esami",
    "Quando studio mi risulta difficile distinguere le informazioni che ricorderò bene da altre che farò fatica a ricordare",
    "Sono pronto/a per una verifica / un esame prevista per un determinato giorno",
    "Quando studio mi capita di andare a rivedere informazioni collegate che avevo visto in altre occasioni",
    "Non sono disposto/a a fare esercizi / approfondimenti non richiesti per essere meglio preparato/a per una prova / un esame",
    "Per imparare bene quello che si studia è importante leggere tutto con la stessa attenzione",
    "Prima di un’interrogazione / una verifica / un esame riesco a organizzarmi il materiale senza bisogno di andare a rileggermi di nuovo tutto",
    "Prima faccio le cose che mi piacciono, poi i compiti / lo studio",
    "Quando faccio i compiti o studio penso al modo migliore per affrontare queste attività",
    "Cerco di avere chiaramente in testa il quadro degli impegni di studio che mi attendono",
    "Dopo un’interrogazione / un compito / un esame non riesco quasi mai a capire come sono andato/a",
    "Quando leggo cerco di formulare delle domande sul contenuto",
    "Durante lo studio cerco di usare le mie parole nel ripetere il contenuto di un testo",
    "Quando studio cerco di restare il più possibile aderente al contenuto del testo",
    "Sono consapevole dei miei limiti e delle mie capacità",
    "Trovo inutile cercare di capire le ragioni di particolari errori commessi",
    "Quando studio cerco di capire quello che leggo",
    "Quando studio per un compito / un’interrogazione / un esame tengo presente ciò che il docente ritiene importante",
    "Quando studio, inizio con le materie / gli argomenti che mi serviranno di più il giorno dopo",
    "Riesco subito a capire se un compito / un esame è facile o difficile",
    "Se mi è andata male un’interrogazione / una prova / un esame capisco se è stato perché non conoscevo l’argomento bene o perché non mi è riuscito di esplorarlo adeguatamente",
    "Quando studio mi interrompo di frequente per fare cose piacevoli",
    "Di solito so organizzare il tempo di studio così da farci rientrare anche i miei hobby",
    "Dopo un compito / un esame scritto capisco quasi sempre se sono andato/a bene o male",
    "Quando studio mi piace rielaborare a modo mio quanto leggo",
    "Se mi va male un compito / un esame cerco di individuarne i motivi",
  ];

  const [items3] = useState(() => melanger(items3Source));

  // Le tableau est divisé en 5 pages (10 items par pages)
  const DEBUT_PARTIE_2 = 10;
  const DEBUT_PARTIE_3 = 20;
  const DEBUT_PARTIE_4 = 30;
  const DEBUT_PARTIE_5 = 40;
  const items3a = items3.slice(0, DEBUT_PARTIE_2);
  const items3b = items3.slice(DEBUT_PARTIE_2, DEBUT_PARTIE_3);
  const items3c = items3.slice(DEBUT_PARTIE_3,DEBUT_PARTIE_4);
  const items3d = items3.slice(DEBUT_PARTIE_4,DEBUT_PARTIE_5);
  const items3e = items3.slice(DEBUT_PARTIE_5);

  const TITRE_TABLEAU =
    "Apprendimento del francese come lingua straniera all’università";

  // réponses[index] = 1 à 5 (index local à la page affichée, remis à zéro entre les pages)
  const [reponses, setReponses] = useState({});
  const [page, setPage] = useState(1);

  const EPREUVE = "ApprocheEtude";
  const PAGES_TABLEAU = [4, 5, 6, 7, 8];

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

  // Affiche un tableau de questions (taille adaptée à la fenêtre, cases carrées)
  const renderTable = (titre, items, onNext) => (
    <TableauEchelle
      titre={titre}
      items={items}
      nbEchelle={5}
      reponses={reponses}
      onChoisir={choisir}
      onNext={onNext}
    />
  );

  if (page === 1) {
    return (
      <div className="instructions"
      >

        <h2>Passiamo al questionario sull’<b>approccio allo studio</b>. <br></br><br></br>
        Qui di seguito sono riportate alcune frasi che si riferiscono all’apprendimento del francese come lingua
         straniera all’università, <b>leggile una alla volta e riporta le tue risposte a fianco</b>. </h2>

        <BoutonAudio fichier="consignes_approcheEtude.mp3" />
        <button onClick={() => setPage(3)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }


/*  if (page === 2) {
    return (
      <div className="instructions">
       <h2>Qui di seguito sono riportate alcune frasi che si riferiscono all’<b>apprendimento del francese come lingua
         straniera all’università</b>, leggile una alla volta e riporta le tue risposte a fianco. 
        </h2> 
        <button onClick={() => setPage(3)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }*/

    if (page === 3) {
    return (
      <div className="instructions">
       <h2>Ricorda che:<br></br></h2>
         <br></br>
         <h2 style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
            1 = mai (o per niente d’accordo)<br></br>
            2 = qualche volta (o poco d’accordo)<br></br>
            3 = spesso (o abbastanza d’accordo)<br></br>
            4 = molto spesso (o molto d’accordo)<br></br>
            5 = sempre (o moltissimo d’accordo)<br></br>
            </h2>
        <BoutonAudio fichier="echelleApprocheEtude.mp3" />
        <button onClick={() => setPage(4)} style={styleBoutonContinuer}>
          Continua
        </button>
      </div>
    );
  }

  if (page === 4) {
    return renderTable(TITRE_TABLEAU, items3a, () =>
      validerPage(items3a, "tableau", 5)
    );
  }

  if (page === 5) {
    return renderTable(
      `${TITRE_TABLEAU} (2ª parte)`,
      items3b,
      () => validerPage(items3b, "tableau", 6)
    );
  }

  if (page === 6) {
    return renderTable(
      `${TITRE_TABLEAU} (3ª parte)`,
      items3c,
      () => validerPage(items3c, "tableau", 7)
    );
  }
  
  // Tableau, quatrième partie (items 31 à 40)
  if (page === 7) {
    return renderTable(
      `${TITRE_TABLEAU} (4ª parte)`,
      items3d,
      () => validerPage(items3d, "tableau", 8)
    );
  }

  // Tableau, cinquième partie (items 41 à 50)
  if (page === 8) {
    return renderTable(
      `${TITRE_TABLEAU} (5ª parte)`,
      items3e,
      () => validerPage(items3e, "tableau", 9, true)
    );
  }

    if (page==9){
      return(
        <div className="instructions">
          <h2>Complimenti! Hai completato il questionario sull’approccio allo studio. </h2>
            <button
                onClick={() => setPage(10)}
                style={styleBoutonContinuer}
            >
                Continua
            </button>
          </div>
      )
    }

    if (page==10){
      return(
        <div className="instructions">
          <h2> Passiamo ora alle prove di francese con i vari subtest: Somiglianze, Vocabolario, 
            Comprensione e Comprensione del testo. Poiché il format dei subtest è lo stesso nelle 
            due lingue, non ci saranno esempi. </h2>
            <BoutonAudio fichier="contenu_subtests_fr.mp3" />
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
