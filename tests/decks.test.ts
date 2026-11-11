import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { deckSchema } from '../server/decks.js';
import { parseLegacy } from '../scripts/import-legacy.js';
const core = JSON.parse(readFileSync('decks/core-it.json', 'utf8'));
test('invalid blank counts, duplicate cards and undersized decks are rejected', () => {
  const bad = structuredClone(core);
  bad.prompts[0].pick = 2;
  assert.equal(deckSchema.safeParse(bad).success, false);
  bad.prompts[0].pick = 1;
  bad.answers[1].id = bad.answers[0].id;
  assert.equal(deckSchema.safeParse(bad).success, false);
  bad.answers = bad.answers.slice(0, 100);
  assert.equal(deckSchema.safeParse(bad).success, false);
});
test('historical parser preserves nested text, ordering, Unicode, escaped punctuation and attribution', () => {
  const answers = Array.from(
    { length: 120 },
    (_, i) => `\\carta{Risposta ${i}: {\\small caffè} al 10\\%.}`,
  ).join('\n');
  const prompts = Array.from(
    { length: 10 },
    (_, i) => `\\carta{Domanda ${i}: \\puntini e \\puntini.}`,
  ).join('\n');
  const source = `By-NC-SA 2.0 IT\nin italiano - RISPOSTE\n${answers}\nin italiano - DOMANDE\n${prompts}`;
  const deck = parseLegacy(source);
  assert.equal(deck.answers.length, 120);
  assert.equal(deck.prompts[0].pick, 2);
  assert.match(deck.answers[0].text, /caffè al 10%/);
  assert.equal(deck.license, 'CC-BY-NC-SA-2.0-IT');
  assert.match(deck.attribution, /Federico/);
  assert.throws(() => parseLegacy(source.replace('By-NC-SA 2.0 IT', 'unknown')), /Licenza/);
  assert.throws(() => parseLegacy(source.replace('caffè', '\\unknown')), /non supportato/);
});
test(
  'optional imported historical deck validates when locally installed',
  { skip: !existsSync('decks/legacy-it.json') },
  () => {
    const deck = deckSchema.parse(JSON.parse(readFileSync('decks/legacy-it.json', 'utf8')));
    assert.equal(deck.prompts.length, 90);
    assert.equal(deck.answers.length, 458);
  },
);
