/** Optional, noncommercial historical deck. Never executed at install/build time. */
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { deckSchema } from '../server/decks.js';
export const REVISION = '5572fcc8a11d25e7ba12025a7488125a3482bf7a';
export const SOURCE = `https://raw.githubusercontent.com/ilario/Cards-Against-Humanity-ITA/${REVISION}/cah-ita-originale-federico.tex`;
function cards(section: string): string[] {
  const result: string[] = [];
  let position = 0;
  while ((position = section.indexOf('\\carta{', position)) !== -1) {
    const start = position + 7;
    let depth = 1,
      end = start;
    for (; end < section.length && depth; end++) {
      if (section[end] === '{' && section[end - 1] !== '\\') depth++;
      if (section[end] === '}' && section[end - 1] !== '\\') depth--;
    }
    if (depth) throw new Error('Parentesi LaTeX non bilanciate: importazione interrotta.');
    const text = section
      .slice(start, end - 1)
      .replace(/\\puntini\b/g, ' ____ ')
      .replace(/\\fontsize\{[^}]*\}\{[^}]*\}/g, '')
      .replace(/\\(?:small|tiny|bf|selectfont)\b/g, '')
      .replace(/\\([%&_])/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\\-/g, '')
      .replace(/``|''/g, '"')
      .replace(/--/g, '–')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.includes('\\'))
      throw new Error(`Comando LaTeX non supportato: ${text.match(/\\[^\s]*/g)?.join(', ')}`);
    if (text) result.push(text);
    position = end;
  }
  return [...new Map(result.map((t) => [t.toLocaleLowerCase('it'), t])).values()];
}
export function parseLegacy(source: string) {
  if (!source.includes('By-NC-SA 2.0 IT'))
    throw new Error('Licenza sorgente inattesa: controllare manualmente.');
  const answersStart = source.indexOf('in italiano - RISPOSTE'),
    promptsStart = source.indexOf('in italiano - DOMANDE');
  if (answersStart < 0 || promptsStart < answersStart)
    throw new Error('Formato sorgente inatteso.');
  const answers = cards(source.slice(answersStart, promptsStart)),
    prompts = cards(source.slice(promptsStart));
  const id = (kind: string, text: string) =>
    `legacy-${kind}-${createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
  return deckSchema.parse({
    id: 'legacy-it',
    name: 'CAH italiano · archivio storico',
    language: 'it',
    version: `2022.01.03-${REVISION.slice(0, 7)}`,
    description:
      'Traduzione storica, esplicita e non aggiornata. Contiene umorismo nero, riferimenti datati e contenuti potenzialmente offensivi. Solo uso non commerciale.',
    license: 'CC-BY-NC-SA-2.0-IT',
    attribution:
      'Cards Against Humanity LLC (originale); Federico (traduzione); Ilario Gelmetti (OCR, correzioni e impaginazione); Luca / CaH42project (regolamento). Adattamento digitale Fuori Contesto: estrazione, normalizzazione spazi e segnaposto, rimozione duplicati, ID e pick.',
    source: `https://github.com/ilario/Cards-Against-Humanity-ITA/blob/${REVISION}/cah-ita-originale-federico.tex`,
    mature: true,
    answers: answers.map((text) => ({ id: id('a', text), text })),
    prompts: prompts.map((text) => ({
      id: id('p', text),
      text,
      pick: Math.max(
        1,
        (text.match(/____/g) || []).length,
        /haiku/i.test(text) ? 3 : /prossima coppia di supereroi/i.test(text) ? 2 : 1,
      ),
    })),
  });
}
async function main() {
  if (!process.argv.includes('--accept-noncommercial'))
    throw new Error(
      'Mazzo CC BY-NC-SA 2.0 IT: leggere docs/decks.md, poi usare npm run decks:import -- --accept-noncommercial. Non è incluso nella licenza MIT.',
    );
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Download fallito (${response.status})`);
  const source = await response.text();
  if (source.length > 1_000_000) throw new Error('Sorgente troppo grande.');
  const deck = parseLegacy(source),
    path = 'decks/legacy-it.json';
  try {
    const existing = await readFile(path, 'utf8');
    if (existing !== JSON.stringify(deck, null, 2) + '\n' && !process.argv.includes('--replace'))
      throw new Error(
        'Mazzo locale modificato. Usa --replace solo dopo aver salvato le modifiche.',
      );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  await writeFile(path, JSON.stringify(deck, null, 2) + '\n');
  console.log(
    `Importate ${deck.prompts.length} domande e ${deck.answers.length} risposte. Riavvia il server per selezionare il mazzo.\nFonte fissata al commit ${REVISION}. Licenza: https://creativecommons.org/licenses/by-nc-sa/2.0/it/`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
