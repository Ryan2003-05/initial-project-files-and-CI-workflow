import * as SQLite from 'expo-sqlite'
import migration2 from './migrations/2_add_next_attempt'

const db = SQLite.openDatabaseSync('ryantasks.db')

const BASE_SCHEMA = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS tasks (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    deadline_date TEXT NOT NULL,
    deadline_time TEXT,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    notification_id TEXT,
    checklist TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    result TEXT,
    deleted INTEGER DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS ryan_prog (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL,
    currency TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    note TEXT,
    photo_url TEXT,
    status TEXT NOT NULL,
    links TEXT,
    images TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    action TEXT NOT NULL,
    local_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retries INTEGER DEFAULT 0,
    last_error TEXT,
    next_attempt INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_updated
    ON tasks(updated_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_deleted
    ON tasks(deleted);
  CREATE INDEX IF NOT EXISTS idx_ryan_prog_deleted
    ON ryan_prog(deleted);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_status
    ON sync_queue(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_user
    ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_ryan_prog_user
    ON ryan_prog(user_id);
`

const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 2, sql: migration2 },
]

const getCurrentVersion = async (): Promise<number> => {
  try {
    const res: any = await db.execAsync('PRAGMA user_version')
    if (Array.isArray(res) && res.length > 0 && res[0].rows) {
      const rows = res[0].rows
      if (rows.length > 0) return rows.item(0).user_version || 0
    }
  } catch (e) {
    // ignore
  }
  return 0
}

export async function initDatabase(): Promise<void> {
  await db.execAsync(BASE_SCHEMA)

  let currentVersion = await getCurrentVersion()

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      try {
        await db.execAsync(migration.sql)
        await db.execAsync(`PRAGMA user_version = ${migration.version}`)
        currentVersion = migration.version
      } catch (e) {
        console.error('Migration failed for version', migration.version, e)
      }
    }
  }
}

export { db }
