import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io, type Socket } from 'socket.io-client';
import { createApp } from '../server/app.js';
import type { Session, View, Reply } from '../shared/types.js';
const request = <T>(s: Socket, event: string, payload: unknown) =>
  new Promise<T>((resolve, reject) => {
    s.timeout(3000).emit(event, payload, (err: Error | null, r: Reply<T>) =>
      err ? reject(err) : r.ok ? resolve(r.data) : reject(new Error(r.error)),
    );
  });
test('real sockets: room, three phones, private hands, reconnect, cross-origin rejection', async () => {
  const app = createApp({ databasePath: ':memory:' });
  await new Promise<void>((r) => app.http.listen(0, '127.0.0.1', r));
  const addr = app.http.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}`;
  const clients: Socket[] = [];
  async function connect() {
    const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    clients.push(s);
    await new Promise<void>((r, j) => {
      s.once('connect', r);
      s.once('connect_error', j);
    });
    return s;
  }
  try {
    const hostSocket = await connect();
    const host = await request<Session>(hostSocket, 'create', {
      deckId: app.game.decks[0].id,
      target: 3,
    });
    const players = [];
    for (const name of ['Ada', 'Bea', 'Carlo']) {
      const s = await connect();
      const session = await request<Session>(s, 'join', { code: host.code, name });
      players.push({ s, session });
    }
    let hostView: View | undefined;
    hostSocket.on('state', (v) => (hostView = v));
    await request(hostSocket, 'command', {
      command: { type: 'start' },
      revision: app.game.room(host.code).revision,
    });
    assert.equal(hostView?.me, null);
    assert.equal(hostView?.phase, 'playing');
    const { s, session } = players[1];
    const before = app.game.view(host.code, session.token);
    s.disconnect();
    const reconnect = await connect();
    let recovered: View | undefined;
    reconnect.on('state', (v) => (recovered = v));
    await request(reconnect, 'resume', session);
    assert.deepEqual(recovered?.me, before.me);
    assert.equal(app.game.room(host.code).players.length, 3);
    await assert.rejects(
      request(reconnect, 'command', {
        command: { type: 'start' },
        revision: app.game.room(host.code).revision,
      }),
      /Solo/,
    );
    await assert.rejects(
      request(reconnect, 'resume', { code: host.code, token: 'a'.repeat(64) }),
      /Sessione/,
    );
    const evil = io(url, {
      transports: ['websocket'],
      extraHeaders: { Origin: 'https://evil.example' },
      forceNew: true,
      reconnection: false,
    });
    clients.push(evil);
    await new Promise<void>((resolve, reject) => {
      evil.once('connect', () => reject(new Error('Cross-origin accepted')));
      evil.once('connect_error', () => resolve());
    });
    // Disconnecting after TTL expiry must not throw outside the request handler.
    app.game.room(host.code).updatedAt = Date.now() - 86400001;
    const disconnected = new Promise<void>((resolve) =>
      app.io.sockets.sockets.get(hostSocket.id!)!.once('disconnect', () => resolve()),
    );
    hostSocket.disconnect();
    await disconnected;
    const health = await fetch(`${url}/api/health`);
    assert.equal(health.status, 200);
  } finally {
    for (const s of clients) s.disconnect();
    await app.close();
  }
});
