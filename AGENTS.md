# Fuori Contesto — agent guide

Italian party game for 3–12 players on a trusted LAN. Node 24 + TypeScript, Express/Socket.IO, built-in SQLite, React/Vite. Keep the product in Italian. No AI API or cloud service is needed to play.

## Start here

- `npm ci`; `npm run dev` serves everything on port 3000.
- `npm run check` runs type checks, meaningful game/network tests and deck validation.
- `npm run build`; `npm start` runs the production build.
- Read `docs/architecture.md` for state/privacy boundaries, `docs/decks.md` for content and licensing, `docs/design.md` for UI decisions.

## Structure

- `server/game.ts`: authoritative rules and per-client projection. Mutate a cloned room, persist once, then broadcast.
- `server/app.ts`: validated socket commands, rate/origin checks and presence.
- `server/store.ts`: SQLite room snapshots, WAL, retention. Migrate existing data deliberately.
- `shared/types.ts`: public contracts; never export private Room/Player state to the browser.
- `src/`: React UI and CSS. Cards and points always come from server state.
- `decks/*.json`: validated, versioned data. New rooms snapshot the selected deck.

## Non-negotiable invariants

1. Host identity and player identity come from server token hashes. Never trust role, score, player ID or card text supplied by a client.
2. Each client sees only its own hand. Host and public watchers see none. Submission authors stay hidden until a winner is chosen.
3. Require the expected revision for every command; reject stale actions without mutation. Scoring cannot be replayed.
4. Multi-card submissions retain order; never deal cards still in a hand or submission.
5. Preserve reconnect behavior and persisted room state. Never log tokens or write credentials into URLs.
6. Keep code MIT, original deck CC0, optional historical data under its own license. Do not commit imported `legacy-it.json` or present it as updated.
7. Ignore runtime data, `.env`, databases and local artifacts. Never publish actual player data or secrets.

## Available repository skills

- `game-engine`: rules, realtime protocol, privacy and persistence work.
- `italian-decks`: add/review Italian cards, validate or update source importers.
- `glass-ui`: Apple-inspired web UI, responsive layout and accessible game interactions.

Load the relevant `.agents/skills/<name>/SKILL.md` when its workflow applies. These skills are portable instructions and require no paid integrations. They do not authorize publishing, deploying or contacting anyone beyond the user's request.

## Verification and delivery

For rule/protocol changes, test invalid commands, role boundaries and a real multi-client round. For persistence changes, reopen the database and resume. For UI work, inspect the actual page, including narrow screens, keyboard focus, long names, selected card order, connection loss and errors. Do not add tests that just match implementation text.

Use small focused changes. Describe behavior, verification and remaining limitations. Do not add speculative taxonomies, frameworks, services or new dependencies without a concrete requirement. No automatic deployment: this repository's initial scope is local/LAN.
