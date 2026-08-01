// ================================================
// TYPES GLOBAUX — RyanTask's
// Calé sur le CDC v1.0
// ================================================

// ----------------
// PRIORITÉS & STATUTS
// ----------------
export type Priority = 'urgente' | 'moyenne' | 'basse'

export type TaskStatus = 'active' | 'terminee' | 'en_retard'

export type TaskResult = 'reussi' | 'echec'

export type ProgStatus = 'en_attente' | 'achete'

export type LinkPlatform = 'whatsapp' | 'tiktok' | 'instagram' | 'facebook' | 'web'

// ----------------
// PROFIL UTILISATEUR
// ----------------
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

// ----------------
// CHECKLIST (§3.3)
// ----------------
export interface ChecklistItem {
  id: string
  task_id: string
  label: string
  is_done: boolean
  position: number
  created_at: string
}

// ----------------
// TÂCHES (§3)
// ----------------
export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  deadline_date: string
  deadline_time: string | null
  reminder_enabled: boolean
  notification_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  result: TaskResult | null
  checklist?: ChecklistItem[]
  _local_id?: string
  _sync_status?: string
}

export interface TaskCreateData {
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
}

// Formulaire création/édition tâche
export interface TaskFormData {
  title: string
  description?: string
  priority: Priority
  deadline_date: string
  deadline_time?: string
  reminder_enabled: boolean
  checklist?: { label: string }[]
}

// ----------------
// LIENS Ryan-Prog (§5.3)
// ----------------
export interface ProgLink {
  id: string
  prog_item_id: string
  url: string
  platform: LinkPlatform
  position: number
}

// ----------------
// IMAGES Ryan-Prog (§5.2)
// ----------------
export interface ProgImage {
  id: string
  prog_item_id: string
  url: string
  position: number
  created_at: string
}

// ----------------
// RYAN-PROG — Mémos achats (§5)
// ----------------
export interface ProgItem {
  id: string
  user_id: string
  name: string
  price: number | null
  currency: string
  phone: string | null
  address: string | null
  note: string | null
  photo_url: string | null
  status: ProgStatus
  created_at: string
  updated_at: string
  links?: ProgLink[]
  images?: ProgImage[]
  _local_id?: string
  _sync_status?: string
}

export interface ProgCreateData {
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
}

// Formulaire création/édition Ryan-Prog
export interface ProgFormData {
  name: string
  price?: number
  currency: string
  phone?: string
  address?: string
  note?: string
  status: ProgStatus
}

// ----------------
// STATISTIQUES (§6)
// ----------------
export interface MonthStats {
  month: number        // 0 = Janvier, 11 = Décembre
  year: number
  created: number
  done: number
  fail: number
  late: number
  rate: number         // taux de réussite en %
}

export interface GlobalStats {
  totalCreated: number
  totalDone: number
  totalFail: number
  totalLate: number
  globalRate: number
  streak: number
  bestMonth: MonthStats | null
  worstMonth: MonthStats | null
  monthlyData: MonthStats[]
}

// ----------------
// NAVIGATION
// ----------------
export type TabName = 'index' | 'ryan-end' | 'ryan-prog' | 'stats'