# Mazzi italiani

## Scelte editoriali e fonti

`core-it.json`: 50 frasi e 160 risposte originali, CC0-1.0, con linguaggio adulto. Non è una traduzione delle carte di Cards Against Humanity. Versione 1.0.0, curabile via pull request, creata con assistenza AI dichiarata nei metadati. Non esiste una sincronizzazione automatica con notizie o social.

Importatore opzionale: [ilario/Cards-Against-Humanity-ITA](https://github.com/ilario/Cards-Against-Humanity-ITA), commit `5572fcc8a11d25e7ba12025a7488125a3482bf7a` del 2022-01-03, file `cah-ita-originale-federico.tex`. L'autore descrive esplicitamente il mazzo come vecchia traduzione. Non lo presentiamo come aggiornato.

Il sorgente dichiara **CC BY-NC-SA 2.0 Italia**: [licenza](https://creativecommons.org/licenses/by-nc-sa/2.0/it/) e [testo legale](https://creativecommons.org/licenses/by-nc-sa/2.0/it/legalcode). Crediti: Cards Against Humanity LLC, Federico, Ilario Gelmetti, Luca / CaH42project. Importazione: estrazione LaTeX, spazi normalizzati, segnaposto `____`, deduplicazione, ID derivati dal testo e conteggio carte richieste. Contenuti espliciti e riferimenti datati: il gestore sceglie consapevolmente il mazzo.

```sh
npm run decks:import -- --accept-noncommercial
npm run decks:validate
```

Riavvia il server dopo l'importazione. `decks/legacy-it.json` è ignorato da Git e non distribuito nel repository MIT. L'importatore non sovrascrive modifiche locali: `--replace` è disponibile dopo averle salvate. Il download è da un URL fisso, senza esecuzione di LaTeX. Errori di rete, licenza inattesa o comandi non riconosciuti interrompono il processo prima della scrittura.

Per aggiornare la fonte storica: verificare la nuova revisione e la licenza, modificare `REVISION` nell'importatore, importare in una copia pulita, ispezionare il diff e il numero delle carte, poi proporre una PR. Nessun aggiornamento remoto silenzioso durante il gioco.

## Formato JSON

Ogni `decks/*.json` viene validato all'avvio. Un file invalido impedisce l'avvio: correggerlo, non ignorarlo in silenzio.

```json
{
  "id": "mio-mazzo-it",
  "name": "Il mio mazzo",
  "language": "it",
  "version": "1.0.0",
  "description": "Tema e tono del mazzo.",
  "license": "CC0-1.0",
  "attribution": "Autore e modifiche",
  "source": "https://example.com/mazzo",
  "mature": true,
  "prompts": [{ "id": "mio-p-001", "text": "Prima ____, poi ____.", "pick": 2 }],
  "answers": [{ "id": "mio-a-001", "text": "Un tostapane con ambizioni." }]
}
```

L'esempio mostra la forma, non un mazzo completo: servono almeno **10 frasi e 120 risposte**, ID e testi univoci, testi di massimo 500 caratteri. `pick` vale 1, 2 o 3. Se usi `____`, il numero di spazi deve corrispondere a `pick`. Le domande senza spazi possono dichiarare quante risposte richiedono.

Mantieni stabili gli ID delle carte esistenti. Correzione testuale: incrementa la patch; aggiunta carte: minor; rimozioni o cambiamenti incompatibili: major. Metti il file nella directory, valida, riavvia; le nuove stanze useranno la nuova versione, quelle esistenti conserveranno la propria copia.

## Contributi

Aggiungi battute originali con riferimenti comprensibili al gruppo e combinazioni grammaticalmente flessibili. Prova le carte con almeno cinque frasi prima di inviarle. Evita copie di espansioni commerciali e dati personali di persone reali non pubbliche. Dichiara fonti, permessi, autore e assistenza AI, se usata. Le proposte al mazzo base vengono offerte sotto CC0; codice e importatore sotto MIT.
