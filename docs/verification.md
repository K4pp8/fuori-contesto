# Verifica della prima release

Eseguita su Node 24 e browser integrato, 11 novembre 2026.

- Test del motore: partita fino al punteggio obiettivo e riavvio, risposte anonime, mani private, ruoli, carte non possedute, revisioni obsolete, doppi invii e doppia assegnazione punti.
- SQLite: chiusura e riapertura del database conservano identità, fase e mano.
- Tre risposte: l'ordine selezionato viene mantenuto.
- Dodici persone: nessuna carta duplicata nelle mani durante riciclo/scarto.
- Socket.IO reale: host più tre client, reconnect, rifiuto origine esterna e credenziali invalide.
- Mazzi: schema, errori, parser con parentesi annidate, Unicode, escape, metadati e licenza. Importazione della fonte fissata riuscita: 90 frasi, 458 risposte.
- Browser: creazione tavolo, invito con indirizzo LAN, tre giocatori, selezione/invio, anonimato, scelta del giudice, assegnazione punto, prossimo round, cambio nome e reload senza duplicazione del giocatore. Nessun errore console rilevato nel flusso.
- Controllo visivo desktop e layout stretto (circa 430 CSS px nel browser integrato), senza overflow orizzontale osservato. Screenshot in questa directory.

Non è stata verificata la scansione con una fotocamera fisica; è stato aperto il link LAN codificato nel QR. Non sono stati eseguiti un audit completo WCAG/screen reader, un test di carico o una pubblicazione internet. Docker non era installato nell’ambiente: il container non è stato eseguito.
