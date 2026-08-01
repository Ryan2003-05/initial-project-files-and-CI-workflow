// ================================================
// TASK REPOSITORY — RyanTask's
// Source de vérité : SQLite d'abord, Supabase ensuite
// ================================================

import { db } from '../database/sqlite'
import { syncQueue } from '../sync/SyncQueue'
import { generateLocalId } from '../utils/generateId'
import { Task, Priority, TaskStatus, TaskResult, ChecklistItem } from '../../types'

export interface LocalTask {
  local_id: string
  server_id: string | null
  user_id: string
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  deadline_date: string
  deadline_time: string | null
  reminder_enabled: number // 0 ou 1 (SQLite ne supporte pas boolean)
  notification_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  result: TaskResult | null
  checklist: string | null // JSON stringifié
  deleted: number // 0 ou 1
  sync_status: string
}

// Convertit LocalTask → Task (pour l'UI)
function toTask(local: LocalTask): Task {
  return {
    id: local.server_id ?? local.local_id,
    user_id: local.user_id,
    title: local.title,
    description: local.description,
    priority: local.priority,
    status: local.status,
    deadline_date: local.deadline_date,
    deadline_time: local.deadline_time,
    reminder_enabled: local.reminder_enabled === 1,
    notification_id: local.notification_id,
    created_at: local.created_at,
    updated_at: local.updated_at,
    completed_at: local.completed_at,
    result: local.result,
    checklist: local.checklist ? JSON.parse(local.checklist) : [],
    // Champs offline
    _local_id: local.local_id,
    _sync_status: local.sync_status,
  }
}

export const TaskRepository = {

  // Récupérer toutes les tâches actives (non supprimées)
  async getAll(userId: string): Promise<Task[]> {
    const rows = await db.getAllAsync<LocalTask>(
      `SELECT * FROM tasks
       WHERE user_id = ? AND deleted = 0
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map(toTask)
  },

  // Récupérer une tâche par local_id ou server_id
  async getById(id: string): Promise<Task | null> {
    const row = await db.getFirstAsync<LocalTask>(
      `SELECT * FROM tasks
       WHERE (local_id = ? OR server_id = ?) AND deleted = 0`,
      [id, id]
    )
    return row ? toTask(row) : null
  },

  // Créer une tâche
  async create(data: {
    user_id: string
    title: string
    description?: string | null
    priority: Priority
    status: TaskStatus
    deadline_date: string
    deadline_time?: string | null
    reminder_enabled: boolean
    notification_id?: string | null
    checklist?: ChecklistItem[]
  }): Promise<Task> {
    const local_id = generateLocalId()
    const now = new Date().toISOString()
    const checklistJson = data.checklist
      ? JSON.stringify(data.checklist)
      : null

    // 1. Insérer dans SQLite immédiatement
    await db.runAsync(
      `INSERT INTO tasks (
        local_id, server_id, user_id, title, description,
        priority, status, deadline_date, deadline_time,
        reminder_enabled, notification_id, created_at, updated_at,
        completed_at, result, checklist, deleted, sync_status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        local_id, null, data.user_id, data.title,
        data.description ?? null, data.priority, data.status,
        data.deadline_date, data.deadline_time ?? null,
        data.reminder_enabled ? 1 : 0, data.notification_id ?? null,
        now, now, null, null, checklistJson, 0, 'pending',
      ]
    )

    // 2. Ajouter à la sync_queue avec payload complet
    await syncQueue.add({
      entity: 'tasks',
      action: 'insert',
      local_id,
      payload: JSON.stringify({
        local_id,
        user_id: data.user_id,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: data.status,
        deadline_date: data.deadline_date,
        deadline_time: data.deadline_time ?? null,
        reminder_enabled: data.reminder_enabled,
        notification_id: data.notification_id ?? null,
        checklist: data.checklist ?? [],
        created_at: now,
        updated_at: now,
      }),
    })

    // 3. Retour immédiat sans attendre Supabase
    return toTask({
      local_id, server_id: null,
      user_id: data.user_id, title: data.title,
      description: data.description ?? null,
      priority: data.priority, status: data.status,
      deadline_date: data.deadline_date,
      deadline_time: data.deadline_time ?? null,
      reminder_enabled: data.reminder_enabled ? 1 : 0,
      notification_id: data.notification_id ?? null,
      created_at: now, updated_at: now,
      completed_at: null, result: null,
      checklist: checklistJson, deleted: 0, sync_status: 'pending',
    })
  },

  // Modifier une tâche
  async update(id: string, updates: Partial<Task>): Promise<void> {
    const updated_at = new Date().toISOString()
    const checklistJson = updates.checklist
      ? JSON.stringify(updates.checklist)
      : undefined

    // Construire la requête dynamiquement
    const fields: string[] = ['updated_at = ?', 'sync_status = ?']
    const values: Array<string | number | null> = [updated_at, 'pending']

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority) }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.deadline_date !== undefined) { fields.push('deadline_date = ?'); values.push(updates.deadline_date) }
    if (updates.deadline_time !== undefined) { fields.push('deadline_time = ?'); values.push(updates.deadline_time) }
    if (updates.reminder_enabled !== undefined) { fields.push('reminder_enabled = ?'); values.push(updates.reminder_enabled ? 1 : 0) }
    if (updates.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }
    if (updates.result !== undefined) { fields.push('result = ?'); values.push(updates.result) }
    if (checklistJson !== undefined) { fields.push('checklist = ?'); values.push(checklistJson) }

    values.push(id, id) // pour WHERE

    await db.runAsync(
      `UPDATE tasks SET ${fields.join(', ')}
       WHERE (local_id = ? OR server_id = ?) AND deleted = 0`,
      values
    )

    // Récupérer le local_id pour la queue
    const row = await db.getFirstAsync<LocalTask>(
      `SELECT * FROM tasks WHERE local_id = ? OR server_id = ?`,
      [id, id]
    )

    if (row) {
      await syncQueue.add({
        entity: 'tasks',
        action: 'update',
        local_id: row.local_id,
        payload: JSON.stringify({
          local_id: row.local_id,
          user_id: row.user_id,
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          deadline_date: row.deadline_date,
          deadline_time: row.deadline_time,
          reminder_enabled: row.reminder_enabled === 1,
          notification_id: row.notification_id,
          completed_at: row.completed_at,
          result: row.result,
          checklist: row.checklist ? JSON.parse(row.checklist) : [],
          created_at: row.created_at,
          updated_at: row.updated_at,
        }),
      })
    }
  },

  // Terminer une tâche (action rapide)
  async complete(id: string, result: TaskResult): Promise<void> {
    const now = new Date().toISOString()
    await this.update(id, {
      status: 'terminee',
      result,
      completed_at: now,
    })
  },

  // Soft delete — jamais de suppression directe
  async delete(id: string): Promise<void> {
    const updated_at = new Date().toISOString()

    await db.runAsync(
      `UPDATE tasks
       SET deleted = 1, sync_status = 'pending_delete', updated_at = ?
       WHERE local_id = ? OR server_id = ?`,
      [updated_at, id, id]
    )

    const row = await db.getFirstAsync<{ local_id: string }>(
      `SELECT local_id FROM tasks WHERE local_id = ? OR server_id = ?`,
      [id, id]
    )

    if (row) {
      await syncQueue.add({
        entity: 'tasks',
        action: 'delete',
        local_id: row.local_id,
        payload: JSON.stringify({ id, updated_at }),
      })
    }
  },

  // Recherche locale (instantanée, sans réseau)
  async search(userId: string, query: string): Promise<Task[]> {
    const q = `%${query.toLowerCase()}%`
    const rows = await db.getAllAsync<LocalTask>(
      `SELECT * FROM tasks
       WHERE user_id = ? AND deleted = 0
       AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)
       ORDER BY created_at DESC`,
      [userId, q, q]
    )
    return rows.map(toTask)
  },

  // Stocker les tâches téléchargées depuis Supabase
  async upsertFromServer(tasks: Task[], userId: string): Promise<void> {
    for (const task of tasks) {
      const existing = await db.getFirstAsync<LocalTask>(
        `SELECT * FROM tasks WHERE server_id = ?`,
        [task.id]
      )

      if (!existing) {
        // Nouveau depuis le serveur → insérer
        await db.runAsync(
          `INSERT OR IGNORE INTO tasks (
            local_id, server_id, user_id, title, description,
            priority, status, deadline_date, deadline_time,
            reminder_enabled, notification_id, created_at, updated_at,
            completed_at, result, checklist, deleted, sync_status
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            task.id, task.id, userId, task.title,
            task.description ?? null, task.priority, task.status,
            task.deadline_date, task.deadline_time ?? null,
            task.reminder_enabled ? 1 : 0, task.notification_id ?? null,
            task.created_at, task.created_at,
            task.completed_at ?? null, task.result ?? null,
            task.checklist ? JSON.stringify(task.checklist) : null,
            0, 'synced',
          ]
        )
      } else {
        // Conflit → Last Write Wins
        const localTime = new Date(existing.updated_at).getTime()
        const remoteTime = new Date(task.updated_at).getTime()

        if (remoteTime > localTime && existing.sync_status === 'synced') {
          await db.runAsync(
            `UPDATE tasks SET
              title=?, description=?, priority=?, status=?,
              deadline_date=?, deadline_time=?, reminder_enabled=?,
              completed_at=?, result=?, checklist=?,
              updated_at=?, sync_status='synced'
             WHERE server_id=?`,
            [
              task.title, task.description ?? null, task.priority,
              task.status, task.deadline_date, task.deadline_time ?? null,
              task.reminder_enabled ? 1 : 0,
              task.completed_at ?? null, task.result ?? null,
              task.checklist ? JSON.stringify(task.checklist) : null,
              task.created_at, task.id,
            ]
          )
        }
      }
    }
  },
}