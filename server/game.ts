import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Card, Command, Deck, Phase, Prompt, Session, View } from '../shared/types.js';
import { deckInfo } from './decks.js';
import type { Store } from './store.js';
type Player = { id: string; tokenHash: string; name: string; score: number; hand: Card[] };
type Submission = { id: string; playerId: string; cards: Card[] };
export type Room = {
  code: string;
  hostHash: string;
  deck: Deck;
  players: Player[];
  phase: Phase;
  target: number;
  revision: number;
  round: number;
  judgeId: string | null;
  prompt: Prompt | null;
  submissions: Submission[];
  answerPile: Card[];
  discard: Card[];
  promptPile: Prompt[];
  winner: Submission | null;
  updatedAt: number;
};
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('hex');
export function shuffle<T>(cards: T[]): T[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function fail(message: string): never {
  throw new Error(message);
}
function nameFor(room: Room, name: string, except?: string) {
  const cleaned = name
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim();
  if (!cleaned || cleaned.length > 24) fail('Scegli un nome da 1 a 24 caratteri.');
  if (
    room.players.some(
      (p) => p.id !== except && p.name.toLocaleLowerCase('it') === cleaned.toLocaleLowerCase('it'),
    )
  )
    fail('Questo nome è già al tavolo. Scegline un altro.');
  return cleaned;
}
export class Game {
  rooms = new Map<string, Room>();
  constructor(
    private store: Store,
    public decks: Deck[],
  ) {
    for (const r of store.load()) this.rooms.set(r.code, r);
  }
  room(code: string) {
    const r = this.rooms.get(code.toUpperCase());
    if (!r || r.updatedAt < Date.now() - 86400000)
      fail('Stanza non trovata o scaduta. Crea un nuovo tavolo.');
    return r;
  }
  private commit(r: Room) {
    r.revision++;
    r.updatedAt = Date.now();
    this.store.save(r);
    this.rooms.set(r.code, r);
  }
  create(deckId: string, target: number): Session {
    if (this.rooms.size >= 200) fail('Il server è al completo. Riprova più tardi.');
    const deck = this.decks.find((d) => d.id === deckId);
    if (!deck) fail('Mazzo non trovato.');
    let code: string;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
    } while (this.rooms.has(code));
    const secret = token();
    const r: Room = {
      code,
      hostHash: hash(secret),
      deck,
      players: [],
      phase: 'lobby',
      target,
      revision: 0,
      round: 0,
      judgeId: null,
      prompt: null,
      submissions: [],
      answerPile: shuffle(deck.answers),
      discard: [],
      promptPile: shuffle(deck.prompts),
      winner: null,
      updatedAt: Date.now(),
    };
    this.commit(r);
    return { code, token: secret, role: 'host' };
  }
  join(code: string, name: string): Session {
    const r = structuredClone(this.room(code));
    if (r.phase !== 'lobby') fail('La partita è già iniziata. Aspetta la prossima.');
    if (r.players.length >= 12) fail('Il tavolo è pieno: massimo 12 giocatori.');
    const cleaned = nameFor(r, name),
      secret = token();
    r.players.push({
      id: randomUUID(),
      tokenHash: hash(secret),
      name: cleaned,
      score: 0,
      hand: [],
    });
    this.commit(r);
    return { code: r.code, token: secret, role: 'player' };
  }
  identity(r: Room, secret?: string) {
    const digest = secret ? hash(secret) : '';
    return { host: digest === r.hostHash, player: r.players.find((p) => p.tokenHash === digest) };
  }
  authenticate(code: string, secret: string) {
    const r = this.room(code),
      id = this.identity(r, secret);
    if (!id.host && !id.player) fail('Sessione non valida. Rientra dal QR.');
    return id;
  }
  private draw(r: Room) {
    if (!r.answerPile.length) {
      r.answerPile = shuffle(r.discard);
      r.discard = [];
    }
    return r.answerPile.pop() ?? fail('Carte esaurite. Riavvia la partita.');
  }
  private round(r: Room) {
    for (const s of r.submissions) r.discard.push(...s.cards);
    r.submissions = [];
    r.winner = null;
    const previous = r.players.findIndex((p) => p.id === r.judgeId);
    r.judgeId = r.players[(previous + 1) % r.players.length].id;
    for (const p of r.players) while (p.hand.length < 10) p.hand.push(this.draw(r));
    if (!r.promptPile.length) r.promptPile = shuffle(r.deck.prompts);
    r.prompt = r.promptPile.pop()!;
    r.round++;
    r.phase = 'playing';
  }
  command(code: string, secret: string, command: Command, expectedRevision: number) {
    const r = structuredClone(this.room(code));
    const { host, player } = this.identity(r, secret);
    if (!host && !player) fail('Sessione non valida. Rientra dal QR.');
    if (r.revision !== expectedRevision) fail('Il tavolo è cambiato. Riprova.');
    const hostOnly = () => {
      if (!host) fail('Solo chi gestisce il tavolo può farlo.');
    };
    switch (command.type) {
      case 'start':
        hostOnly();
        if (r.phase !== 'lobby' || r.players.length < 3)
          fail('Servono almeno 3 giocatori per iniziare.');
        this.round(r);
        break;
      case 'play': {
        if (!player || r.phase !== 'playing' || player.id === r.judgeId)
          fail('Non puoi giocare una carta adesso.');
        if (r.submissions.some((s) => s.playerId === player.id)) fail('Hai già giocato.');
        if (
          command.cardIds.length !== r.prompt?.pick ||
          new Set(command.cardIds).size !== command.cardIds.length
        )
          fail('Scegli il numero di carte richiesto.');
        const cards = command.cardIds.map(
          (id) =>
            player.hand.find((c) => c.id === id) ?? fail('Questa carta non è nella tua mano.'),
        );
        player.hand = player.hand.filter((c) => !command.cardIds.includes(c.id));
        r.submissions.push({ id: randomUUID(), playerId: player.id, cards });
        if (r.submissions.length === r.players.length - 1) {
          r.phase = 'judging';
          r.submissions = shuffle(r.submissions);
        }
        break;
      }
      case 'choose': {
        if (!player || player.id !== r.judgeId || r.phase !== 'judging')
          fail('Solo il giudice può scegliere, dopo tutte le risposte.');
        const winner =
          r.submissions.find((s) => s.id === command.submissionId) ?? fail('Risposta non trovata.');
        const p = r.players.find((p) => p.id === winner.playerId)!;
        p.score++;
        r.winner = winner;
        r.phase = p.score >= r.target ? 'finished' : 'result';
        break;
      }
      case 'next':
        hostOnly();
        if (r.phase !== 'result') fail('Il round non è ancora finito.');
        this.round(r);
        break;
      case 'skip':
        hostOnly();
        if (!['playing', 'judging'].includes(r.phase)) fail('Nessun round da saltare.');
        this.round(r);
        break;
      case 'rename':
        if (!player) fail('Il tavolo non ha un nome giocatore.');
        player.name = nameFor(r, command.name, player.id);
        break;
      case 'kick': {
        hostOnly();
        const removed =
          r.players.find((p) => p.id === command.playerId) ?? fail('Giocatore non trovato.');
        r.players = r.players.filter((p) => p.id !== removed.id);
        r.discard.push(...removed.hand);
        // Cancel the active round and return submitted cards to the discard pile.
        for (const s of r.submissions) r.discard.push(...s.cards);
        r.submissions = [];
        r.winner = null;
        if (r.phase !== 'lobby' && r.phase !== 'finished') {
          if (r.players.length >= 3) this.round(r);
          else {
            r.phase = 'lobby';
            r.prompt = null;
            r.judgeId = null;
          }
        }
        break;
      }
      case 'restart':
        hostOnly();
        if (r.phase !== 'finished') fail('Completa la partita prima di ricominciare.');
        r.phase = 'lobby';
        r.round = 0;
        r.judgeId = null;
        r.prompt = null;
        r.submissions = [];
        r.winner = null;
        r.answerPile = shuffle(r.deck.answers);
        r.discard = [];
        r.promptPile = shuffle(r.deck.prompts);
        for (const p of r.players) {
          p.score = 0;
          p.hand = [];
        }
        break;
    }
    this.commit(r);
  }
  view(code: string, secret?: string, online = new Set<string>()): View {
    const r = this.room(code),
      { host, player } = this.identity(r, secret);
    return {
      code: r.code,
      revision: r.revision,
      phase: r.phase,
      round: r.round,
      target: r.target,
      deck: deckInfo(r.deck),
      players: r.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        online: online.has(p.id),
        submitted: r.submissions.some((s) => s.playerId === p.id),
      })),
      judgeId: r.judgeId,
      prompt: r.prompt,
      submissions:
        r.phase === 'playing' || r.phase === 'lobby'
          ? []
          : r.submissions.map((s) => ({ id: s.id, cards: s.cards })),
      winner: r.winner ? { playerId: r.winner.playerId, cards: r.winner.cards } : null,
      me: player
        ? {
            id: player.id,
            hand: player.hand,
            submitted: r.submissions.some((s) => s.playerId === player.id),
          }
        : null,
      isHost: host,
    };
  }
  prune() {
    for (const [code, r] of this.rooms)
      if (r.updatedAt < Date.now() - 86400000) this.rooms.delete(code);
    this.store.prune();
  }
}
