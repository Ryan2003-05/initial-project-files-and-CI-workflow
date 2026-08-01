import { supabase } from '../supabase'
import { SyncPayload } from './types'

export const syncApi = {
  async insertTask(payload: SyncPayload) {
    return supabase
      .from('tasks')
      .insert(payload)
      .select('id')
      .single()
  },

  async insertChecklistItems(items: any[]) {
    return supabase.from('checklist_items').insert(items)
  },

  async updateTask(serverId: string, payload: SyncPayload) {
    return supabase
      .from('tasks')
      .update(payload)
      .eq('id', serverId)
  },

  async deleteTask(serverId: string) {
    return supabase
      .from('tasks')
      .delete()
      .eq('id', serverId)
  },

  async insertProgItem(payload: SyncPayload) {
    return supabase
      .from('prog_items')
      .insert(payload)
      .select('id')
      .single()
  },

  async insertProgLinks(items: any[]) {
    return supabase.from('prog_links').insert(items)
  },

  async updateProgItem(serverId: string, payload: SyncPayload) {
    return supabase
      .from('prog_items')
      .update(payload)
      .eq('id', serverId)
  },

  async deleteProgItem(serverId: string) {
    return supabase
      .from('prog_items')
      .delete()
      .eq('id', serverId)
  },

  async getCurrentUser() {
    return supabase.auth.getUser()
  },

  async getUpdatedTasks(userId: string, since: string) {
    return supabase
      .from('tasks')
      .select(`*, checklist:checklist_items(*)`)
      .eq('user_id', userId)
      .gt('updated_at', since)
  },

  async getUpdatedProgItems(userId: string, since: string) {
    return supabase
      .from('prog_items')
      .select(`*, links:prog_links(*), images:prog_images(*)`)
      .eq('user_id', userId)
      .gt('updated_at', since)
  },
}
