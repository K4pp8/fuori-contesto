# Contribuire a Fuori Contesto

Sono benvenute correzioni, migliorie accessibili e carte italiane originali.

1. Apri una issue per cambiamenti importanti o nuove regole; per bug piccoli basta una PR.
2. Crea un branch, installa Node 24 e usa `npm ci`.
3. Mantieni le regole sul server e i testi dell'interfaccia in italiano.
4. Esegui `npm run check` e `npm run build`. Per cambi UI verifica desktop e telefono. Per carte segui `docs/decks.md`.
5. Descrivi problema, risultato e verifiche nella PR. Aggiungi screenshot per cambi visivi e un test di regressione per bug del motore.

Non includere `.env`, database, token, mani reali, dati di partecipanti o `node_modules`. Se usi un assistente AI, verifica l'output e dichiara l'assistenza nelle modifiche editoriali. Leggi `AGENTS.md` per gli invarianti.

Il codice contribuito usa MIT. Le nuove carte originali proposte per `core-it.json` sono dedicate sotto CC0-1.0. Non accettiamo carte copiate senza una licenza compatibile e attribuzione. Non cambiare la licenza di contenuti importati.
