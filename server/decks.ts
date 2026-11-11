import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { Deck, DeckInfo } from '../shared/types.js';
const card = z.object({ id: z.string().min(1).max(100), text: z.string().trim().min(1).max(500) });
export const deckSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    language: z.literal('it'),
    version: z.string().min(1),
    description: z.string(),
    license: z.string().min(1),
    attribution: z.string().min(1),
    source: z.string().url(),
    mature: z.boolean(),
    prompts: z.array(card.extend({ pick: z.number().int().min(1).max(3) })).min(10),
    answers: z.array(card).min(120),
  })
  .superRefine((d, ctx) => {
    const ids = [...d.prompts, ...d.answers].map((c) => c.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'ID duplicati' });
    for (const list of [d.prompts, d.answers])
      if (new Set(list.map((c) => c.text.toLocaleLowerCase('it'))).size !== list.length)
        ctx.addIssue({ code: 'custom', message: 'Testi duplicati' });
    for (const p of d.prompts) {
      const blanks = (p.text.match(/____/g) || []).length;
      if (blanks && blanks !== p.pick)
        ctx.addIssue({ code: 'custom', message: `Numero spazi errato: ${p.id}` });
    }
  });
export function loadDecks(dir = resolve('decks')): Deck[] {
  const decks = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => deckSchema.parse(JSON.parse(readFileSync(resolve(dir, f), 'utf8'))));
  if (!decks.length || new Set(decks.map((d) => d.id)).size !== decks.length)
    throw new Error('Mazzi mancanti o ID mazzo duplicati');
  return decks;
}
export function deckInfo(d: Deck): DeckInfo {
  const { prompts, answers, ...info } = d;
  return { ...info, promptCount: prompts.length, answerCount: answers.length };
}
