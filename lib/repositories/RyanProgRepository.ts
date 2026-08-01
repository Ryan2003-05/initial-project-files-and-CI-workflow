// ================================================
// RYAN PROG REPOSITORY — RyanTask's
// Source de vérité : SQLite d'abord
// ================================================

import { db } from '../database/sqlite'
import { syncQueue } from '../sync/SyncQueue'
import { generateLocalId } from '../utils/generateId'
import { ProgItem, ProgStatus, ProgLink, ProgImage } from '../../types'

export interface LocalProgItem {
  local_id: string
  server_id: string | null
  user_id: string
  name: string
  price: number | null
  currency: string
  phone: string | null
  address: string | null
  note: string | null
  photo_url: string | null
  status: ProgStatus
  links: string | null    // JSON stringifié
  images: string | null   // JSON stringifié
  created_at: string
  updated_at: string
  deleted: number
  sync_status: string
}

function toProgItem(local: LocalProgItem): ProgItem {
  return {
    id: local.server_id ?? local.local_id,
    user_id: local.user_id,
    name: local.name,
    price: local.price,
    currency: local.currency,
    phone: local.phone,
    address: local.address,
    note: local.note,
    photo_url: local.photo_url,
    status: local.status,
    created_at: local.created_at,
    updated_at: local.updated_at,
    links: local.links ? JSON.parse(local.links) : [],
    images: local.images ? JSON.parse(local.images) : [],
    _local_id: local.local_id,
    _sync_status: local.sync_status,
  }
}

export const RyanProgRepository = {

  async getAll(userId: string): Promise<ProgItem[]> {
    const rows = await db.getAllAsync<LocalProgItem>(
      `SELECT * FROM ryan_prog
       WHERE user_id = ? AND deleted = 0
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map(toProgItem)
  },

  async getById(id: string): Promise<ProgItem | null> {
    const row = await db.getFirstAsync<LocalProgItem>(
      `SELECT * FROM ryan_prog
       WHERE (local_id = ? OR server_id = ?) AND deleted = 0`,
      [id, id]
    )
    return row ? toProgItem(row) : null
  },

  async create(data: {
    user_id: string
    name: string
    price?: number | null
    currency: string
    phone?: string | null
    address?: string | null
    note?: string | null
    photo_url?: string | null
    status: ProgStatus
    links?: ProgLink[]
    images?: ProgImage[]
  }): Promise<ProgItem> {
    const local_id = generateLocalId()
    const now = new Date().toISOString()
    const linksJson = data.links ? JSON.stringify(data.links) : null
    const imagesJson = data.images ? JSON.stringify(data.images) : null

    await db.runAsync(
      `INSERT INTO ryan_prog (
        local_id, server_id, user_id, name, price, currency,
        phone, address, note, photo_url, status, links, images,
        created_at, updated_at, deleted, sync_status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        local_id, null, data.user_id, data.name,
        data.price ?? null, data.currency,
        data.phone ?? null, data.address ?? null,
        data.note ?? null, data.photo_url ?? null,
        data.status, linksJson, imagesJson,
        now, now, 0, 'pending',
      ]
    )

    await syncQueue.add({
      entity: 'ryan_prog',
      action: 'insert',
      local_id,
      payload: JSON.stringify({
        local_id,
        user_id: data.user_id,
        name: data.name,
        price: data.price ?? null,
        currency: data.currency,
        phone: data.phone ?? null,
        address: data.address ?? null,
        note: data.note ?? null,
        photo_url: data.photo_url ?? null,
        status: data.status,
        links: data.links ?? [],
        created_at: now,
        updated_at: now,
      }),
    })

    return toProgItem({
      local_id, server_id: null,
      user_id: data.user_id, name: data.name,
      price: data.price ?? null, currency: data.currency,
      phone: data.phone ?? null, address: data.address ?? null,
      note: data.note ?? null, photo_url: data.photo_url ?? null,
      status: data.status, links: linksJson, images: imagesJson,
      created_at: now, updated_at: now, deleted: 0, sync_status: 'pending',
    })
  },

  async update(id: string, updates: Partial<ProgItem>): Promise<void> {
    const updated_at = new Date().toISOString()
    const fields: string[] = ['updated_at = ?', 'sync_status = ?']
    const values: Array<string | number | null> = [updated_at, 'pending']

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price) }
    if (updates.currency !== undefined) { fields.push('currency = ?'); values.push(updates.currency) }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone) }
    if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address) }
    if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note) }
    if (updates.photo_url !== undefined) { fields.push('photo_url = ?'); values.push(updates.photo_url) }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.links !== undefined) { fields.push('links = ?'); values.push(JSON.stringify(updates.links)) }
    if (updates.images !== undefined) { fields.push('images = ?'); values.push(JSON.stringify(updates.images)) }

    values.push(id, id)

    await db.runAsync(
      `UPDATE ryan_prog SET ${fields.join(', ')}
       WHERE (local_id = ? OR server_id = ?) AND deleted = 0`,
      values
    )

    const row = await db.getFirstAsync<LocalProgItem>(
      `SELECT * FROM ryan_prog WHERE local_id = ? OR server_id = ?`,
      [id, id]
    )

    if (row) {
      await syncQueue.add({
        entity: 'ryan_prog',
        action: 'update',
        local_id: row.local_id,
        payload: JSON.stringify({
          local_id: row.local_id,
          user_id: row.user_id,
          name: row.name,
          price: row.price,
          currency: row.currency,
          phone: row.phone,
          address: row.address,
          note: row.note,
          photo_url: row.photo_url,
          status: row.status,
          links: row.links ? JSON.parse(row.links) : [],
          images: row.images ? JSON.parse(row.images) : [],
          created_at: row.created_at,
          updated_at: row.updated_at,
        }),
      })
    }
  },

  async delete(id: string): Promise<void> {
    const updated_at = new Date().toISOString()

    await db.runAsync(
      `UPDATE ryan_prog
       SET deleted = 1, sync_status = 'pending_delete', updated_at = ?
       WHERE local_id = ? OR server_id = ?`,
      [updated_at, id, id]
    )

    const row = await db.getFirstAsync<{ local_id: string }>(
      `SELECT local_id FROM ryan_prog WHERE local_id = ? OR server_id = ?`,
      [id, id]
    )

    if (row) {
      await syncQueue.add({
        entity: 'ryan_prog',
        action: 'delete',
        local_id: row.local_id,
        payload: JSON.stringify({ id, updated_at }),
      })
    }
  },

  // Recherche locale par nom, téléphone, adresse, note, plateforme
  async search(userId: string, query: string): Promise<ProgItem[]> {
    const q = `%${query.toLowerCase()}%`
    const rows = await db.getAllAsync<LocalProgItem>(
      `SELECT * FROM ryan_prog
       WHERE user_id = ? AND deleted = 0
       AND (
         LOWER(name) LIKE ? OR
         LOWER(phone) LIKE ? OR
         LOWER(address) LIKE ? OR
         LOWER(note) LIKE ? OR
         LOWER(links) LIKE ?
       )
       ORDER BY created_at DESC`,
      [userId, q, q, q, q, q]
    )
    return rows.map(toProgItem)
  },

  async upsertFromServer(items: ProgItem[], userId: string): Promise<void> {
    for (const item of items) {
      const existing = await db.getFirstAsync<LocalProgItem>(
        `SELECT * FROM ryan_prog WHERE server_id = ?`,
        [item.id]
      )

      if (!existing) {
        await db.runAsync(
          `INSERT OR IGNORE INTO ryan_prog (
            local_id, server_id, user_id, name, price, currency,
            phone, address, note, photo_url, status, links, images,
            created_at, updated_at, deleted, sync_status
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            item.id, item.id, userId, item.name,
            item.price ?? null, item.currency,
            item.phone ?? null, item.address ?? null,
            item.note ?? null, item.photo_url ?? null,
            item.status,
            item.links ? JSON.stringify(item.links) : null,
            item.images ? JSON.stringify(item.images) : null,
            item.created_at, item.created_at, 0, 'synced',
          ]
        )
      } else {
        const localTime = new Date(existing.updated_at).getTime()
        const remoteTime = new Date(item.updated_at).getTime()

        if (remoteTime > localTime && existing.sync_status === 'synced') {
          await db.runAsync(
            `UPDATE ryan_prog SET
              name=?, price=?, currency=?, phone=?, address=?,
              note=?, photo_url=?, status=?, links=?, images=?,
              updated_at=?, sync_status='synced'
             WHERE server_id=?`,
            [
              item.name, item.price ?? null, item.currency,
              item.phone ?? null, item.address ?? null,
              item.note ?? null, item.photo_url ?? null, item.status,
              item.links ? JSON.stringify(item.links) : null,
              item.images ? JSON.stringify(item.images) : null,
              item.created_at, item.id,
            ]
          )
        }
      }
    }
  },
}