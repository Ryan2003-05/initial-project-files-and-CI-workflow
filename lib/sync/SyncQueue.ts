import { db } from '../database/sqlite'
import { generateLocalId } from '../utils/generateId'

export interface AddActionInput {
  entity: string
  action: 'insert' | 'update' | 'delete'
  local_id: string
  payload: string
}

export interface SyncAction {
  id: string
  entity: string
  action: string
  local_id: string
  payload: string
  status: string
  retries: number
  last_error: string | null
  next_attempt?: number | null
  created_at: string
}

export const syncQueue = {

  async add(input: AddActionInput): Promise<void> {
    await db.runAsync(
      `INSERT INTO sync_queue
       (id, entity, action, local_id, payload, status, retries, last_error, next_attempt, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        generateLocalId(),
        input.entity,
        input.action,
        input.local_id,
        input.payload,
        'pending',
        0,
        null,
        null,
        new Date().toISOString(),
      ]
    )
  },

  async getPending(): Promise<SyncAction[]> {
    return await db.getAllAsync<SyncAction>(
      `SELECT * FROM sync_queue
       WHERE (
         status = 'pending'
         OR (status = 'failed' AND retries < 5 AND (next_attempt IS NULL OR next_attempt <= strftime('%s','now')))
       )
       ORDER BY created_at ASC
       LIMIT 50`
    )
  },

  async markProcessing(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sync_queue SET status = 'processing' WHERE id = ?`,
      [id]
    )
  },

  async markDone(id: string): Promise<void> {
    await db.runAsync(
      `DELETE FROM sync_queue WHERE id = ?`,
      [id]
    )
  },

  async markFailed(id: string, error: string): Promise<void> {
    // Read current retries
    const row = await db.getFirstAsync<{ retries: number }>(
      `SELECT retries FROM sync_queue WHERE id = ?`,
      [id]
    )
    const current = row?.retries ?? 0
    const nextRetries = current + 1
    // Exponential backoff in seconds, capped at 3600s (1h)
    const backoff = Math.min(3600, Math.pow(2, nextRetries) * 60)
    const nextAttempt = Math.floor(Date.now() / 1000) + backoff

    await db.runAsync(
      `UPDATE sync_queue
       SET status = 'failed', retries = ?, last_error = ?, next_attempt = ?
       WHERE id = ?`,
      [nextRetries, error, nextAttempt, id]
    )
  },

  async resetFailed(): Promise<void> {
    await db.runAsync(
      `UPDATE sync_queue
       SET status = 'pending', next_attempt = NULL
       WHERE status = 'failed' AND retries < 5`
    )
  },

  async count(): Promise<number> {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue
       WHERE status IN ('pending', 'failed')`
    )
    return result?.count ?? 0
  },

  async getOldPending(): Promise<number> {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue
       WHERE status IN ('pending', 'failed')
       AND created_at < datetime('now', '-7 days')`
    )
    return result?.count ?? 0
  },
}