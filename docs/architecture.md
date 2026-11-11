# Architettura

## Flusso

Browser tavolo e telefoni → Socket.IO → Game (autorità sulle regole) → SQLite.

Express serve configurazione e health check. In sviluppo incorpora Vite; in produzione serve `dist/client`. Il server compilato parte da `dist/server/index.js`. Tutti usano la stessa origine e la stessa porta: non serve configurare un endpoint backend nei telefoni.

`Game` clona la stanza prima di applicare una mutazione. Solo un comando valido viene salvato su SQLite e sostituisce lo stato in memoria. Le operazioni sono sincrone in un processo Node; una revisione crescente respinge azioni obsolete e doppi click. Gli eventi concorrenti validi possono richiedere un nuovo tentativo dopo la sincronizzazione.

## Fasi e visibilità

`lobby → playing → judging → result → playing … → finished → lobby`

- Il gestore del tavolo ha un token distinto dai giocatori. Il ruolo deriva dall'hash sul server, mai dal ruolo dichiarato dal client.
- Il gestore avvia, passa al round successivo, salta un round e rimuove giocatori. Non può leggere le mani o scegliere il vincitore al posto del giudice.
- Ogni giocatore vede solo la propria mano. Durante la raccolta nessuna risposta viene pubblicata. Alla scelta sono pubblici testo e ID casuale della risposta, non il suo autore.
- Il giudice non invia carte. È l'unico che può assegnare il punto, una volta sola.
- I nomi sono univoci nella stanza, ignorando maiuscole/minuscole, e hanno massimo 24 caratteri.
- Ingressi in lobby, massimo 12 persone. Si parte con almeno 3.
- Carte multiple mantengono l'ordine di selezione. Le carte giocate entrano negli scarti al round successivo; solo gli scarti vengono rimescolati quando il mazzo finisce. Le mani non vengono duplicate.
- Rimuovere una persona annulla il round corrente; con meno di 3 si torna in lobby.

## Persistenza e riconnessione

SQLite, modalità WAL, tabella `rooms(code, state, updated_at)`, schema `user_version=1`. La stanza contiene una copia del mazzo: cambiare il file JSON non cambia una partita già avviata. Nessun token in chiaro nel database, solo SHA-256 di token casuali a 256 bit. Non inserire token in URL, QR o log.

Il browser conserva il token in `localStorage`, separato per codice stanza. Ricaricare o riconnettere il socket ripristina identità e mano. Più schede con lo stesso token rappresentano lo stesso giocatore. La presenza è transitoria e viene ricalcolata dai socket connessi, senza scritture su disco.

TTL: 24 ore dall'ultima mutazione di gioco. Pulizia ogni minuto; un riavvio carica solo stanze non scadute. Il backup richiede server fermo oppure SQLite backup API; copiare solo il file principale mentre WAL è attivo può perdere scritture.

## Confini operativi

Una sola istanza Node. Il database su disco locale non è adatto a repliche concorrenti o filesystem di rete. Snapshot JSON semplici e limitati a 200 stanze, 12 giocatori ciascuna; sincronizzazione completa delle viste. Il limite non sostituisce un benchmark di carico.

Limite payload Socket.IO 8 KiB; 600 eventi al minuto per indirizzo IP, condivisi da chi usa lo stesso NAT. Validazione Zod di ogni evento e controllo origine WebSocket. Il rate limiter è in memoria: non è protezione DDoS. Non usare proxy non fidati o abilitare `trust proxy` indiscriminatamente.

Per un servizio pubblico servono revisione operativa, HTTPS, proxy configurato, limiti di connessioni/creazione stanza e gestione abusi adeguati al traffico. Questa release non include matchmaking pubblico, account, chat, moderazione remota, multi-server o cambio host automatico. Se il browser del gestore perde il token, si crea un altro tavolo.

## Superficie eventi

`create {deckId,target}` → sessione host; `join {code,name}` → sessione giocatore; `resume {code,token}` → recupero; `watch {code}` → vista pubblica; `command {revision,command}` → azione autorizzata. Risposte `{ok,data}` / `{ok:false,error}`. Ogni aggiornamento invia `state: View` individualmente, mai l'oggetto Room.

Riferimenti: [Socket.IO server options](https://socket.io/docs/v4/server-options/), [SQLite in Node](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
