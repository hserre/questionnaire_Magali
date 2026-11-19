"""Listes des items des tableaux (Stratégies, Approche), dans l'ordre des fichiers
StrategiesEtude.jsx / StrategiesEtude2.jsx / ApprocheEtude.jsx.
Sert seulement à numéroter les réponses enregistrées avant le 16/11/2026 (le front
envoie maintenant le numéro de l'item dans position_question)."""
import re
import unicodedata

ITEMS = {
    "tableau1": [
        "Pensare alle cose che eventualmente già si conoscono sull’argomento",
        "Dare una scorsa veloce al testo prima di iniziare la lettura",
        "Leggere almeno una volta ad alta voce il testo",
        "Sottolineare durante la prima lettura",
        "Sottolineare usando evidenziatori o matite di diverso colore",
        "Prendere appunti durante lo studio del testo",
        "Durante la lettura cercare di prevedere ciò che verrà detto nelle parti successive del testo",
        "Durante lo studio del testo ripetersi con parole proprie i punti più salienti",
        "Scrivere a fianco del testo delle idee guida",
        "Cercare di memorizzare i punti principali con qualche trucco mnemonico (metodo dei luoghi, metodo della storia, ecc.)",
        "Controllare che si stia comprendendo il testo",
        "Prendere immediatamente delle contromisure se si ha l’impressione di non capire",
        "Lasciar perdere il punto specifico o sospendere lo studio se la sensazione di non comprendere si protrae e riprenderlo successivamente",
        "Cercare di integrare lo studio del testo con altri testi o sussidi",
        "Decidere di non studiare certi argomenti perché poco rilevanti",
        "Durante lo studio riassumere per iscritto con parole proprie",
        "Farsi schemi",
        "Informarsi su quali potrebbero essere le domande d’esame",
        "Immaginare per proprio conto quali potrebbero essere le domande dell’esame",
        "Fare una prova dell’esame, anticipando con l’immaginazione le caratteristiche dell’evento, in modo da essere preparato/a a gestire l’ansia e gli imprevisti"
    ],
    "tableau2": [
        "Prendere precauzioni relative al proprio benessere psicofisico (alimentazione, sonno, orari) per massimizzare i benefici dello studio",
        "Controllare e prendere precauzioni per non distrarsi",
        "Studiare in ambienti comuni (ad esempio in biblioteca, nella camera dove studia qualcun altro, ecc.) per farsi ispirare dall’esempio altrui e non disperdersi",
        "Accompagnare lo studio con musica o altra fonte audiovisiva di sottofondo",
        "Farsi una tabella di marcia per lo studio: quanto tempo? Distribuito come?",
        "Scegliere un modo diverso di affrontare lo studio a seconda del tipo di attività e di obiettivi",
        "Intervallare lo studio delle materie",
        "Ripassare a distanza di tempo",
        "Evidenziare i punti poco ricordati e concentrare il ripasso su di essi",
        "Studiare con un amico",
        "Ripetere con un amico"
    ],
    "approche": [
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
        "Se mi va male un compito / un esame cerco di individuarne i motivi"
    ]
}


def _n(t):
    t = unicodedata.normalize("NFC", str(t)).replace("\u00a0", " ")
    return re.sub(r"\s+", " ", t).strip()


_INDEX = {cle: {_n(t): i for i, t in enumerate(liste, start=1)} for cle, liste in ITEMS.items()}


def numero_item(epreuve, partie, texte):
    """Numéro (1, 2...) de l'item dans sa liste, ou None."""
    if epreuve in ("StrategiesEtude_ideal", "StrategiesEtude_reel") and partie in ("tableau1", "tableau2"):
        return _INDEX[partie].get(_n(texte))
    if epreuve == "ApprocheEtude" and partie == "tableau":
        return _INDEX["approche"].get(_n(texte))
    return None
