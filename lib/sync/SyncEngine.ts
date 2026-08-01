// ================================================
// SYNC ENGINE — RyanTask's
// Push local → Supabase, Pull Supabase → SQLite
// ================================================

import { syncApi } from './syncApi'
import { syncQueue, SyncAction } from './SyncQueue'
import { db } from '../database/sqlite'
import { TaskRepository } from '../repositories/TaskRepository'
import { RyanProgRepository } from '../repositories/RyanProgRepository'
import { monitoring } from '../monitoring'

type ChecklistPayload = {
  label: string
  is_done?: boolean
  position?: number
}

type ProgLinkPayload = {
  url: string
  platform: string
  position?: number
}

type SyncPayload = {
  [key: string]: unknown
  checklist?: ChecklistPayload[]
  links?: ProgLinkPayload[]
}

const getSyncMetadata = async (key: string): Promise<string | null> => {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = ?`,
    [key]
  )
  return row?.value ?? null
}

const setSyncMetadata = async (key: string, value: string): Promise<void> => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [key, value]
  )
}

const getDeadlineFields = (payload: SyncPayload) => ({
  deadline_date: payload.deadline_date,
  deadline_time: payload.deadline_time ?? null,
})

const normalizeTaskPayload = (payload: SyncPayload) => ({
  user_id: payload.user_id,
  title: payload.title,
  description: payload.description,
  priority: payload.priority,
  status: payload.status,
  ...getDeadlineFields(payload),
  reminder_enabled: payload.reminder_enabled,
  notification_id: payload.notification_id,
  completed_at: payload.completed_at,
  result: payload.result,
})

const normalizeProgPayload = (payload: SyncPayload) => ({
  user_id: payload.user_id,
  name: payload.name,
  price: payload.price,
  currency: payload.currency,
  phone: payload.phone,
  address: payload.address,
  note: payload.note,
  photo_url: payload.photo_url,
  status: payload.status,
})

const buildChecklistItems = (payload: SyncPayload, taskId: string) => {
  if (!Array.isArray(payload.checklist) || payload.checklist.length === 0) return []
  return payload.checklist.map((item, i) => ({
    task_id: taskId,
    label: item.label,
    is_done: item.is_done ?? false,
    position: item.position ?? i,
  }))
}

const buildProgLinks = (payload: SyncPayload, progItemId: string) => {
  if (!Array.isArray(payload.links) || payload.links.length === 0) return []
  return payload.links.map((link, i) => ({
    prog_item_id: progItemId,
    url: link.url,
    platform: link.platform,
    position: link.position ?? i,
  }))
}

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}

const validateSyncPayload = (action: { entity: string; action: string }, payload: SyncPayload) => {
  if (!payload) throw new Error('Payload missing')
  // For update/delete require local_id; for insert it's optional (tests/mocks)
  if (action.action !== 'insert' && !payload.local_id) throw new Error('Payload missing local_id for update/delete')
}

export const SyncEngine = {
  isRunning: false,
  lastError: null as string | null,

  async sync(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true
    this.lastError = null
    try {
      // RÈGLE : toujours push avant pull
      await this.pushLocalChanges()
      await this.pullRemoteChanges()
    } catch (e) {
      const message = formatErrorMessage(e)
      monitoring.captureException(e, { location: 'SyncEngine.sync' })
      this.lastError = message
    } finally {
      this.isRunning = false
    }
  },

  async pushLocalChanges(): Promise<void> {
    await syncQueue.resetFailed()
    const actions = await syncQueue.getPending()

    for (const action of actions) {
      await syncQueue.markProcessing(action.id)
      try {
        await this.executeAction(action)
        await syncQueue.markDone(action.id)

        // Mettre à jour sync_status dans SQLite
        const table = action.entity === 'tasks' ? 'tasks' : 'ryan_prog'
        await db.runAsync(
          `UPDATE ${table} SET sync_status = 'synced' WHERE local_id = ?`,
          [action.local_id]
        )
      } catch (err) {
        const message = formatErrorMessage(err)
        monitoring.captureException(err, { location: 'SyncEngine.pushLocalChanges', actionId: action.id })
        this.lastError = message
        await syncQueue.markFailed(action.id, message)
      }
    }
  },

  async executeAction(action: SyncAction): Promise<void> {
    const payload = JSON.parse(action.payload) as SyncPayload

    try {
      validateSyncPayload(action as any, payload)
    } catch (err) {
      const msg = formatErrorMessage(err)
      console.error('[SyncEngine] Invalid payload for action', action.id, msg)
      throw new Error(msg)
    }

    // ---- TASKS ----
    if (action.entity === 'tasks') {
      if (action.action === 'insert') {
        // Vérifie si déjà synced (double envoi)
        const existing = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM tasks WHERE local_id = ?`,
          [action.local_id]
        )
        if (existing?.server_id) return // Déjà synced

        const { data, error } = await syncApi.insertTask(normalizeTaskPayload(payload))

        if (error) throw error

        // Stocker le server_id reçu de Supabase
        await db.runAsync(
          `UPDATE tasks SET server_id = ? WHERE local_id = ?`,
          [data.id, action.local_id]
        )

        const checklistItems = buildChecklistItems(payload, data.id)
        if (checklistItems.length > 0) {
          await syncApi.insertChecklistItems(checklistItems)
        }

      } else if (action.action === 'update') {
        const row = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM tasks WHERE local_id = ?`,
          [action.local_id]
        )
        if (!row?.server_id) return // Pas encore synced — skip

        const { error } = await syncApi.updateTask(row.server_id, normalizeTaskPayload(payload))

        if (error) throw error

      } else if (action.action === 'delete') {
        const row = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM tasks WHERE local_id = ?`,
          [action.local_id]
        )

        if (!row?.server_id) {
          // Jamais synced → supprimer directement de SQLite
          await db.runAsync(
            `DELETE FROM tasks WHERE local_id = ?`,
            [action.local_id]
          )
          return
        }

        const { error } = await syncApi.deleteTask(row.server_id)

        if (error) throw error

        // Suppression confirmée → supprimer de SQLite
        await db.runAsync(
          `DELETE FROM tasks WHERE local_id = ?`,
          [action.local_id]
        )
      }
    }

    // ---- RYAN PROG (table: prog_items dans Supabase) ----
    if (action.entity === 'ryan_prog') {
      if (action.action === 'insert') {
        const existing = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM ryan_prog WHERE local_id = ?`,
          [action.local_id]
        )
        if (existing?.server_id) return

        const { data, error } = await syncApi.insertProgItem(normalizeProgPayload(payload))

        if (error) throw error

        await db.runAsync(
          `UPDATE ryan_prog SET server_id = ? WHERE local_id = ?`,
          [data.id, action.local_id]
        )

        const progLinks = buildProgLinks(payload, data.id)
        if (progLinks.length > 0) {
          await syncApi.insertProgLinks(progLinks)
        }

      } else if (action.action === 'update') {
        const row = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM ryan_prog WHERE local_id = ?`,
          [action.local_id]
        )
        if (!row?.server_id) return

        const { error } = await syncApi.updateProgItem(row.server_id, normalizeProgPayload(payload))

        if (error) throw error

      } else if (action.action === 'delete') {
        const row = await db.getFirstAsync<{ server_id: string | null }>(
          `SELECT server_id FROM ryan_prog WHERE local_id = ?`,
          [action.local_id]
        )

        if (!row?.server_id) {
          await db.runAsync(
            `DELETE FROM ryan_prog WHERE local_id = ?`,
            [action.local_id]
          )
          return
        }

        const { error } = await syncApi.deleteProgItem(row.server_id)

        if (error) throw error

        await db.runAsync(
          `DELETE FROM ryan_prog WHERE local_id = ?`,
          [action.local_id]
        )
      }
    }
  },

  async pullRemoteChanges(): Promise<void> {
    try {
      const { data: { user } } = await syncApi.getCurrentUser()
      if (!user) return

      const lastSync = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_metadata WHERE key = 'last_sync_at'`
      )
      const since = lastSync?.value ?? '1970-01-01T00:00:00.000Z'

      // Pull tasks
      const { data: tasks, error: tasksError } = await syncApi.getUpdatedTasks(user.id, since)

      if (!tasksError && tasks) {
        await TaskRepository.upsertFromServer(tasks, user.id)
      }

      // Pull prog_items
      const { data: progItems, error: progError } = await syncApi.getUpdatedProgItems(user.id, since)

      if (!progError && progItems) {
        await RyanProgRepository.upsertFromServer(progItems, user.id)
      }

      const now = new Date().toISOString()
      await db.runAsync(
        `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync_at', ?)`,
        [now]
      )

      const firstSyncDone = await getSyncMetadata('first_sync_done')
      if (!firstSyncDone) {
        await setSyncMetadata('first_sync_done', '1')
      }
    } catch (error) {
      this.lastError = formatErrorMessage(error)
    }
  },
}