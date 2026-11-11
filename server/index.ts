import { resolve } from 'node:path';
import express from 'express';
import { createApp } from './app.js';
const production = process.argv[1]?.endsWith('.js');
const port = Number(process.env.PORT ?? 3000),
  host = process.env.HOST ?? '0.0.0.0';
const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '');
if (publicUrl && !/^https?:\/\//.test(publicUrl))
  throw new Error('PUBLIC_URL deve essere un URL http(s).');
const server = createApp({ databasePath: process.env.DATABASE_PATH, publicUrl });
let vite: { close: () => Promise<void> } | undefined;
if (production) {
  server.app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    next();
  });
  server.app.use(express.static(resolve('dist/client')));
  server.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/client/index.html')));
} else {
  const { createServer } = await import('vite');
  const dev = await createServer({
    server: { middlewareMode: true, hmr: { server: server.http } },
    appType: 'spa',
  });
  vite = dev;
  server.app.use(dev.middlewares);
}
server.http.listen(port, host, () =>
  console.log(
    `\nFuori Contesto → http://localhost:${port}\nApri il tavolo e condividi il QR. Usa PUBLIC_URL per scegliere l'indirizzo LAN.\n`,
  ),
);
async function shutdown() {
  await vite?.close();
  await server.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
