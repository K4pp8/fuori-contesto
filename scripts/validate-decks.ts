import { loadDecks } from '../server/decks.js';
for (const d of loadDecks())
  console.log(
    `${d.id} ${d.version}: ${d.prompts.length} domande, ${d.answers.length} risposte · ${d.license}`,
  );
