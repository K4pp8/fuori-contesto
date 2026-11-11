export type Card = { id: string; text: string };
export type Prompt = Card & { pick: number };
export type Deck = {
  id: string;
  name: string;
  language: 'it';
  version: string;
  description: string;
  license: string;
  attribution: string;
  source: string;
  mature: boolean;
  prompts: Prompt[];
  answers: Card[];
};
export type DeckInfo = Omit<Deck, 'prompts' | 'answers'> & {
  promptCount: number;
  answerCount: number;
};
export type Phase = 'lobby' | 'playing' | 'judging' | 'result' | 'finished';
export type PublicPlayer = {
  id: string;
  name: string;
  score: number;
  online: boolean;
  submitted: boolean;
};
export type View = {
  code: string;
  revision: number;
  phase: Phase;
  round: number;
  target: number;
  deck: DeckInfo;
  players: PublicPlayer[];
  judgeId: string | null;
  prompt: Prompt | null;
  submissions: { id: string; cards: Card[] }[];
  winner: { playerId: string; cards: Card[] } | null;
  me: { id: string; hand: Card[]; submitted: boolean } | null;
  isHost: boolean;
};
export type Session = { code: string; token: string; role: 'host' | 'player' };
export type Command =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'skip' }
  | { type: 'restart' }
  | { type: 'play'; cardIds: string[] }
  | { type: 'choose'; submissionId: string }
  | { type: 'rename'; name: string }
  | { type: 'kick'; playerId: string };
export type Reply<T> = { ok: true; data: T } | { ok: false; error: string };
