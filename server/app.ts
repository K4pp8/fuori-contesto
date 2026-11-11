import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { networkInterfaces } from 'node:os';
import { z } from 'zod';
import { Game } from './game.js';
import { Store } from './store.js';
import { loadDecks, deckInfo } from './decks.js';
import type { Deck } from '../shared/types.js';
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/);
const secretSchema = z.string().regex(/^[a-f0-9]{64}$/);
const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('skip') }),
  z.object({ type: z.literal('restart') }),
  z.object({ type: z.literal('play'), cardIds: z.array(z.string().max(100)).min(1).max(3) }),
  z.object({ type: z.literal('choose'), submissionId: z.string().uuid() }),
  z.object({ type: z.literal('rename'), name: z.string().min(1).max(60) }),
  z.object({ type: z.literal('kick'), playerId: z.string().uuid() }),
]);
export function createApp(
  options: { databasePath?: string; decks?: Deck[]; publicUrl?: string } = {},
) {
  const store = new Store(options.databasePath ?? './data/fuori-contesto.sqlite');
  const game = new Game(store, options.decks ?? loadDecks());
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  const http = createServer(app);
  const io = new Server(http, {
    maxHttpBufferSize: 8192,
    serveClient: false,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) return callback(null, true);
      try {
        callback(null, new URL(origin).host === req.headers.host || origin === options.publicUrl);
      } catch {
        callback(null, false);
      }
    },
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/config', (_req, res) => {
    const address = http.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => `http://${i!.address}:${port}`);
    res.json({
      decks: game.decks.map(deckInfo),
      publicUrl: options.publicUrl ?? null,
      lanUrls: addresses,
    });
  });
  const rates = new Map<string, { count: number; reset: number }>();
  const cleanup = setInterval(() => {
    game.prune();
    for (const [key, v] of rates) if (v.reset < Date.now()) rates.delete(key);
  }, 60000);
  cleanup.unref();
  function broadcast(code: string) {
    // A disconnect can arrive between TTL expiry and the next cleanup tick.
    const room = game.rooms.get(code);
    if (!room || room.updatedAt < Date.now() - 86400000) return;
    const clients = [...io.sockets.sockets.values()].filter((s) => s.data.code === code);
    const online = new Set<string>();
    for (const s of clients) {
      const { player } = game.identity(room, s.data.token);
      if (player) online.add(player.id);
    }
    for (const s of clients) s.emit('state', game.view(code, s.data.token, online));
  }
  io.on('connection', (socket) => {
    function handle(event: string, schema: z.ZodTypeAny, fn: (payload: any) => unknown) {
      socket.on(event, (payload, ack) => {
        if (typeof ack !== 'function') return;
        try {
          const ip = socket.handshake.address,
            now = Date.now();
          let limit = rates.get(ip);
          if (!limit || limit.reset < now) {
            limit = { count: 0, reset: now + 60000 };
            rates.set(ip, limit);
          }
          if (++limit.count > 600) throw new Error('Troppe richieste. Aspetta un minuto.');
          const parsed = schema.parse(payload);
          const data = fn(parsed);
          ack({ ok: true, data });
        } catch (error) {
          ack({
            ok: false,
            error:
              error instanceof z.ZodError
                ? 'Dati non validi. Controlla i campi.'
                : error instanceof Error
                  ? error.message
                  : 'Qualcosa è andato storto.',
          });
        }
      });
    }
    function attach(code: string, token?: string) {
      const previous = socket.data.code;
      socket.data.code = code;
      socket.data.token = token;
      if (previous && previous !== code && game.rooms.has(previous)) broadcast(previous);
      broadcast(code);
      return null;
    }
    handle(
      'create',
      z.object({ deckId: z.string().max(100), target: z.number().int().min(3).max(15) }),
      (p) => {
        const session = game.create(p.deckId, p.target);
        attach(session.code, session.token);
        return session;
      },
    );
    handle('join', z.object({ code: codeSchema, name: z.string().min(1).max(60) }), (p) => {
      const session = game.join(p.code, p.name);
      attach(session.code, session.token);
      return session;
    });
    handle('resume', z.object({ code: codeSchema, token: secretSchema }), (p) => {
      game.authenticate(p.code, p.token);
      return attach(p.code, p.token);
    });
    handle('watch', z.object({ code: codeSchema }), (p) => {
      game.room(p.code);
      return attach(p.code);
    });
    handle(
      'command',
      z.object({ command: commandSchema, revision: z.number().int().nonnegative() }),
      (p) => {
        if (!socket.data.code || !socket.data.token) throw new Error('Entra prima nella stanza.');
        try {
          game.command(socket.data.code, socket.data.token, p.command, p.revision);
        } catch (e) {
          broadcast(socket.data.code);
          throw e;
        }
        broadcast(socket.data.code);
        return null;
      },
    );
    socket.on('disconnect', () => {
      if (socket.data.code && game.rooms.has(socket.data.code)) broadcast(socket.data.code);
    });
  });
  return {
    app,
    http,
    io,
    game,
    store,
    close: async () => {
      clearInterval(cleanup);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      store.close();
    },
  };
}
