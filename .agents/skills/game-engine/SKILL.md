---
name: game-engine
description: Modify Fuori Contesto rules, Socket.IO events, player authorization or SQLite persistence while preserving private hands and reconnect behavior.
---

Read `server/game.ts`, `server/app.ts`, `shared/types.ts` and `docs/architecture.md` before changing their contracts. Identify the allowed phases and actor for the action being changed.

The room is private server state. Build client output only through `Game.view`; never broadcast a Room, host hash, player token hash or another player's hand. Host is a spectator controller, not the judge. The judge rotates among actual players. Submitted answer authors must not appear in the judging view.

Apply commands to a clone and commit once after validation. Keep revision rejection atomic, including malformed multi-card picks and repeated scoring. On reconnect, derive identity from the existing token; do not create another player. A deck is embedded in the persisted room so content updates affect only new games.

Use the existing test harnesses to reproduce the changed behavior: successful round, wrong actor, stale revision and private/public projections. For storage work also close/reopen SQLite. For socket changes include real Socket.IO clients and origin validation. Run `npm run check` and `npm run build`. Document deliberate changes to phase transitions or persisted schema in the architecture doc.
