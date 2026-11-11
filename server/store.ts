import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Room } from './game.js';
export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL); PRAGMA user_version=1;',
    );
  }
  load(): Room[] {
    return (
      this.db
        .prepare('SELECT state FROM rooms WHERE updated_at > ?')
        .all(Date.now() - 86400000) as { state: string }[]
    ).map((r) => JSON.parse(r.state));
  }
  save(room: Room) {
    this.db
      .prepare(
        'INSERT INTO rooms VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at',
      )
      .run(room.code, JSON.stringify(room), room.updatedAt);
  }
  prune() {
    this.db.prepare('DELETE FROM rooms WHERE updated_at <= ?').run(Date.now() - 86400000);
  }
  close() {
    this.db.close();
  }
}
