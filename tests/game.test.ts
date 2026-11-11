import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Game } from '../server/game.js';
import { Store } from '../server/store.js';
import { loadDecks } from '../server/decks.js';
import type { Command, Session } from '../shared/types.js';
const decks = loadDecks();
function setup(n = 3) {
  const store = new Store(':memory:');
  const game = new Game(store, decks);
  const host = game.create(decks[0].id, 3);
  const players = Array.from({ length: n }, (_, i) => game.join(host.code, `Persona ${i + 1}`));
  const cmd = (s: Session, c: Command) =>
    game.command(s.code, s.token, c, game.room(s.code).revision);
  return { store, game, host, players, cmd };
}
test('complete match, anonymous answers, private hands, scoring, restart', () => {
  const { store, game, host, players, cmd } = setup();
  try {
    cmd(host, { type: 'start' });
    let rounds = 0;
    while (game.room(host.code).phase !== 'finished') {
      assert.ok(++rounds < 20);
      const r = game.room(host.code);
      assert.equal(game.view(host.code).me, null);
      assert.equal(game.view(host.code, host.token).me, null);
      for (const s of players) {
        const v = game.view(s.code, s.token);
        if (v.me!.id === r.judgeId) continue;
        cmd(s, { type: 'play', cardIds: v.me!.hand.slice(0, r.prompt!.pick).map((c) => c.id) });
      }
      const v = game.view(host.code);
      assert.equal(v.phase, 'judging');
      assert.ok(v.submissions.every((s) => !('playerId' in s)));
      assert.ok(!JSON.stringify(v).includes('tokenHash'));
      const judge = players.find((s) => game.view(s.code, s.token).me!.id === r.judgeId)!;
      cmd(judge, { type: 'choose', submissionId: v.submissions[0].id });
      assert.equal(
        game.room(host.code).players.reduce((n, p) => n + p.score, 0),
        rounds,
      );
      if (game.room(host.code).phase !== 'finished') cmd(host, { type: 'next' });
    }
    assert.equal(Math.max(...game.room(host.code).players.map((p) => p.score)), 3);
    cmd(host, { type: 'restart' });
    assert.equal(game.room(host.code).phase, 'lobby');
    assert.ok(game.room(host.code).players.every((p) => p.score === 0 && p.hand.length === 0));
  } finally {
    store.close();
  }
});
test('reject privilege escalation, duplicates, foreign cards, stale actions without mutation', () => {
  const { store, game, host, players, cmd } = setup();
  try {
    assert.throws(() => game.join(host.code, 'persona 1'), /già/);
    assert.throws(() => cmd(players[0], { type: 'start' }), /Solo/);
    cmd(host, { type: 'start' });
    const actor = players.find(
      (s) => game.view(s.code, s.token).me!.id !== game.room(s.code).judgeId,
    )!;
    const before = JSON.stringify(game.room(host.code));
    assert.throws(() => cmd(actor, { type: 'play', cardIds: ['foreign'] }));
    assert.equal(JSON.stringify(game.room(host.code)), before);
    assert.throws(
      () => game.command(actor.code, actor.token, { type: 'rename', name: 'Altro' }, 0),
      /cambiato/,
    );
    const v = game.view(actor.code, actor.token);
    cmd(actor, { type: 'play', cardIds: v.me!.hand.slice(0, v.prompt!.pick).map((c) => c.id) });
    assert.equal(game.view(actor.code).submissions.length, 0);
    assert.throws(() => cmd(actor, { type: 'play', cardIds: [v.me!.hand[0].id] }), /già/);
    assert.throws(() => cmd(host, { type: 'choose', submissionId: 'fake' }), /Solo il giudice/);
    assert.throws(() => game.authenticate(host.code, 'invalid'), /Sessione/);
  } finally {
    store.close();
  }
});
test('SQLite restores exact state and player identity after process restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fc-test-'));
  const path = join(dir, 'game.sqlite');
  let store = new Store(path);
  try {
    let game = new Game(store, decks);
    const host = game.create(decks[0].id, 5);
    const p = game.join(host.code, 'Ada');
    game.join(host.code, 'Bea');
    game.join(host.code, 'Carlo');
    game.command(host.code, host.token, { type: 'start' }, game.room(host.code).revision);
    const before = game.view(p.code, p.token);
    store.close();
    store = new Store(path);
    game = new Game(store, decks);
    assert.deepEqual(game.view(p.code, p.token), before);
    assert.ok(game.authenticate(p.code, p.token).player);
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
test('12 players, multi-card prompts and recycled deck never duplicate a live card', () => {
  const { store, game, host, players, cmd } = setup(12);
  try {
    cmd(host, { type: 'start' });
    for (let i = 0; i < 40; i++) {
      const r = game.room(host.code);
      const live = r.players.flatMap((p) => p.hand.map((c) => c.id));
      assert.equal(new Set(live).size, live.length);
      assert.equal(live.length, 120);
      const actor = players.find((s) => game.view(s.code, s.token).me!.id !== r.judgeId)!;
      const view = game.view(actor.code, actor.token);
      cmd(actor, {
        type: 'play',
        cardIds: view.me!.hand.slice(0, r.prompt!.pick).map((c) => c.id),
      });
      cmd(host, { type: 'skip' });
    }
  } finally {
    store.close();
  }
});
test('rename, kick and canceled round recover cleanly', () => {
  const { store, game, host, players, cmd } = setup(4);
  try {
    cmd(players[1], { type: 'rename', name: '  Nome vero  ' });
    assert.equal(game.view(players[1].code, players[1].token).players[1].name, 'Nome vero');
    cmd(host, { type: 'start' });
    const id = game.view(players[0].code, players[0].token).me!.id;
    cmd(host, { type: 'kick', playerId: id });
    assert.equal(game.room(host.code).phase, 'playing');
    assert.throws(() => game.authenticate(host.code, players[0].token));
    const id2 = game.view(players[1].code, players[1].token).me!.id;
    cmd(host, { type: 'kick', playerId: id2 });
    assert.equal(game.room(host.code).phase, 'lobby');
    assert.throws(() => cmd(host, { type: 'start' }), /almeno 3/);
  } finally {
    store.close();
  }
});
test('three-card ordered submissions and duplicate replay cannot add points', () => {
  const { store, game, host, players, cmd } = setup();
  try {
    game.room(host.code).promptPile = [
      game.room(host.code).deck.prompts.find((p) => p.pick === 3)!,
    ];
    cmd(host, { type: 'start' });
    let expected: string[] = [];
    for (const s of players) {
      const v = game.view(s.code, s.token);
      if (v.me!.id === v.judgeId) continue;
      const ids = v
        .me!.hand.slice(0, 3)
        .reverse()
        .map((c) => c.id);
      if (!expected.length) expected = ids;
      cmd(s, { type: 'play', cardIds: ids });
    }
    assert.ok(
      game
        .view(host.code)
        .submissions.some(
          (s) => JSON.stringify(s.cards.map((c) => c.id)) === JSON.stringify(expected),
        ),
    );
    const judge = players.find(
      (s) => game.view(s.code, s.token).me!.id === game.room(host.code).judgeId,
    )!;
    const id = game.view(host.code).submissions[0].id;
    cmd(judge, { type: 'choose', submissionId: id });
    assert.throws(() => cmd(judge, { type: 'choose', submissionId: id }));
    assert.equal(
      game.room(host.code).players.reduce((n, p) => n + p.score, 0),
      1,
    );
  } finally {
    store.close();
  }
});
