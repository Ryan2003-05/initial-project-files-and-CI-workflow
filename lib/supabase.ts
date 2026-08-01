// ================================================
// CONFIGURATION SUPABASE — RyanTask's
// Auth + BDD + Storage
// ================================================

import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile, Task, ChecklistItem, ProgItem, ProgLink, ProgImage } from '../types'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'

// Les valeurs sensibles sont lues depuis les variables d'environnement.
// En production / EAS, définissez `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`
// ou `SUPABASE_URL` / `SUPABASE_ANON_KEY` via les secrets.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  // Warning only — tests and dev may mock the module; do not throw here to keep startup resilient.
  // Ensure you set secrets before publishing: `eas secret:create --name SUPABASE_ANON_KEY --value <key>`
  console.warn('Supabase URL or ANON KEY not set. Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.')
}

// CLIENT SUPABASE — stockage sécurisé du token JWT via expo-secure-store
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) =>
        SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export const authRepository = {
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('authRepository.getUser error:', error)
      return null
    }
    return user
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('authRepository.getSession error:', error)
      return null
    }
    return session
  },

  onAuthStateChange(handler: (event: string, session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handler(event, session)
    })
    return () => subscription.unsubscribe()
  },

  async signInWithPassword(credentials: { email: string; password: string }) {
    return supabase.auth.signInWithPassword(credentials)
  },

  async signUp(options: Parameters<typeof supabase.auth.signUp>[0]) {
    return supabase.auth.signUp(options)
  },
}

// 
// HELPERS — PROFIL
// 
export const profileService = {

  // Récupérer le profil de l'utilisateur connecté
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) { console.error('getProfile:', error); return null }
    return data
  },

  // Mettre à jour le profil (nom, avatar)
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
    if (error) { console.error('updateProfile:', error); return false }
    return true
  },

  // Upload avatar vers Supabase Storage
  async uploadAvatar(userId: string, fileUri: string): Promise<string | null> {
    try {
      const fileName = `${userId}/avatar.jpg`

      // Lit le fichier en base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Convertit en ArrayBuffer pour l'upload Supabase
      const arrayBuffer = decode(base64)

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (error) {
        console.error('uploadAvatar storage error:', error)
        return null
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      return `${data.publicUrl}?t=${Date.now()}`
    } catch (err) {
      console.error('uploadAvatar exception:', err)
      return null
    }
  },
}

// 
// HELPERS — TÂCHES
// 
export const taskService = {

  // Récupérer toutes les tâches de l'utilisateur
  async getTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, checklist:checklist_items(*)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) { console.error('getTasks:', error); return [] }
    return data || []
  },

  // Créer une nouvelle tâche
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at' | 'result'>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()
    if (error) { console.error('createTask:', error); return null }
    return data
  },

  // Mettre à jour une tâche
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
    if (error) { console.error('updateTask:', error); return false }
    return true
  },

  // Terminer une tâche (→ Ryan-End)
  async completeTask(taskId: string, result: 'reussi' | 'echec'): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'terminee',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
    if (error) { console.error('completeTask:', error); return false }
    return true
  },

  // Supprimer une tâche
  async deleteTask(taskId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    if (error) { console.error('deleteTask:', error); return false }
    return true
  },
}

// 
// HELPERS — CHECKLIST
// 
export const checklistService = {

  // Ajouter un item à la checklist
  async addItem(taskId: string, label: string, position: number): Promise<ChecklistItem | null> {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({ task_id: taskId, label, position })
      .select()
      .single()
    if (error) { console.error('addItem:', error); return null }
    return data
  },

  // Cocher/décocher un item
  async toggleItem(itemId: string, isDone: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_done: isDone })
      .eq('id', itemId)
    if (error) { console.error('toggleItem:', error); return false }
    return true
  },

  // Supprimer un item
  async deleteItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)
    if (error) { console.error('deleteItem:', error); return false }
    return true
  },
}

// 
// HELPERS — RYAN-PROG
// 
export const progService = {

  // Récupérer tous les mémos d'achats
  async getProgItems(userId: string): Promise<ProgItem[]> {
    const { data, error } = await supabase
      .from('prog_items')
      .select(`*, links:prog_links(*), images:prog_images(*)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) { console.error('getProgItems:', error); return [] }
    return data || []
  },

  // Créer un mémo d'achat
  async createProgItem(item: Omit<ProgItem, 'id' | 'created_at' | 'links' | 'images'>): Promise<ProgItem | null> {
    const { data, error } = await supabase
      .from('prog_items')
      .insert(item)
      .select()
      .single()
    if (error) { console.error('createProgItem:', error); return null }
    return data
  },

  // Mettre à jour un mémo
  async updateProgItem(itemId: string, updates: Partial<ProgItem>): Promise<boolean> {
    const { error } = await supabase
      .from('prog_items')
      .update(updates)
      .eq('id', itemId)
    if (error) { console.error('updateProgItem:', error); return false }
    return true
  },

  // Supprimer un mémo
  async deleteProgItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('prog_items')
      .delete()
      .eq('id', itemId)
    if (error) { console.error('deleteProgItem:', error); return false }
    return true
  },

  // Ajouter un lien (WhatsApp, Instagram…)
  async addLink(progItemId: string, url: string, platform: ProgLink['platform'], position: number): Promise<ProgLink | null> {
    console.log('Tentative addLink:', { progItemId, url, platform, position })

    const { data, error } = await supabase
      .from('prog_links')
      .insert({
        prog_item_id: progItemId,
        url: url,
        platform: platform,
        position: position,
      })
      .select()
      .single()

    if (error) {
      console.error('addLink ERREUR COMPLÈTE:', JSON.stringify(error))
      return null
    }

    console.log('addLink SUCCÈS:', JSON.stringify(data))
    return data
  },

  // Supprimer un lien
  async deleteLink(linkId: string): Promise<boolean> {
    const { error } = await supabase
      .from('prog_links')
      .delete()
      .eq('id', linkId)
    if (error) { console.error('deleteLink:', error); return false }
    return true
  },

  // Upload image article
  async uploadImage(progItemId: string, fileUri: string, position: number): Promise<ProgImage | null> {
    try {
      const fileName = `${progItemId}/${Date.now()}.jpg`

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const arrayBuffer = decode(base64)

      const { error: uploadError } = await supabase.storage
        .from('prog-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        console.error('uploadImage storage error:', uploadError)
        return null
      }

      const { data: urlData } = supabase.storage.from('prog-images').getPublicUrl(fileName)

      const { data, error } = await supabase
        .from('prog_images')
        .insert({ prog_item_id: progItemId, url: urlData.publicUrl, position })
        .select()
        .single()

      if (error) {
        console.error('saveImageRecord:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('uploadImage exception:', err)
      return null
    }
  },

  async deleteImage(imageId: string, imageUrl: string): Promise<boolean> {
    try {
      // Extrait le chemin du fichier depuis l'URL publique
      const urlParts = imageUrl.split('/prog-images/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0]
        await supabase.storage.from('prog-images').remove([filePath])
      }

      const { error } = await supabase
        .from('prog_images')
        .delete()
        .eq('id', imageId)

      if (error) {
        console.error('deleteImage:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('deleteImage exception:', err)
      return false
    }
  },
}