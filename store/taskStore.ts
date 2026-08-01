// ================================================
// TASK STORE — RyanTask's
// Migré vers Repositories (Offline First)
// ================================================

import { create } from 'zustand'
import { parseISO, isBefore, startOfDay, subDays } from 'date-fns'
import { Task, ProgItem, GlobalStats, MonthStats, TaskCreateData, ProgCreateData } from '../types'
import { TaskRepository } from '../lib/repositories/TaskRepository'
import { RyanProgRepository } from '../lib/repositories/RyanProgRepository'

interface TaskStore {
  tasks: Task[]
  progItems: ProgItem[]
  loading: boolean
  userId: string | null
  error: string | null

  setUserId: (id: string) => void
  clearError: () => void
  fetchTasks: (userId: string) => Promise<void>
  fetchProgItems: (userId: string) => Promise<void>
  addTask: (task: TaskCreateData) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  checkOverdueTasks: () => void
  addProgItem: (item: ProgCreateData) => Promise<ProgItem>
  updateProgItem: (itemId: string, updates: Partial<ProgItem>) => Promise<void>
  deleteProgItem: (itemId: string) => Promise<void>
  getLateTasks: () => Task[]
  getArchivedTasks: () => Task[]
  getStats: () => GlobalStats
  searchTasks: (query: string) => Promise<Task[]>
  searchProgItems: (query: string) => Promise<ProgItem[]>
}

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  progItems: [],
  loading: false,
  userId: null,
  error: null,

  setUserId: (id) => set({ userId: id }),
  clearError: () => set({ error: null }),

  // Charge depuis SQLite — instantané, pas de réseau
  fetchTasks: async (userId) => {
    set({ loading: true, error: null })
    try {
      const tasks = await TaskRepository.getAll(userId)
      set({ tasks, loading: false, error: null })
    } catch (error) {
      set({ loading: false, error: formatErrorMessage(error) })
    }
  },

  fetchProgItems: async (userId) => {
    try {
      const progItems = await RyanProgRepository.getAll(userId)
      set({ progItems, error: null })
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  addTask: async (task: TaskCreateData) => {
    try {
      const newTask = await TaskRepository.create(task)
      set(state => ({ tasks: [newTask, ...state.tasks], error: null }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  updateTask: async (taskId, updates) => {
    try {
      await TaskRepository.update(taskId, updates)
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
        error: null,
      }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  completeTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const now = new Date()
      const deadlineDate = parseISO(task.deadline_date)

      if (task.deadline_time) {
        const [hours, minutes] = task.deadline_time.split(':').map(Number)
        deadlineDate.setHours(hours, minutes, 0, 0)
      } else {
        deadlineDate.setHours(23, 59, 59, 0)
      }

      const result = isBefore(now, deadlineDate) ? 'reussi' : 'echec'

      await TaskRepository.complete(taskId, result)
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, status: 'terminee', result, completed_at: now.toISOString() }
            : t
        ),
        error: null,
      }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  deleteTask: async (taskId) => {
    try {
      await TaskRepository.delete(taskId)
      // Soft delete — on retire de l'UI mais reste dans SQLite jusqu'à sync
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        error: null,
      }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  checkOverdueTasks: () => {
    const now = new Date()
    set(state => ({
      tasks: state.tasks.map(t => {
        if (t.status === 'active') {
          const deadlineDate = parseISO(t.deadline_date)
          if (t.deadline_time) {
            const [hours, minutes] = t.deadline_time.split(':').map(Number)
            deadlineDate.setHours(hours, minutes, 0, 0)
          } else {
            deadlineDate.setHours(23, 59, 59, 0)
          }
          if (isBefore(deadlineDate, now)) {
            // Mettre à jour dans SQLite aussi
            TaskRepository.update(t.id, { status: 'en_retard' })
            return { ...t, status: 'en_retard' as const }
          }
        }
        return t
      }),
    }))
  },

  addProgItem: async (item: ProgCreateData) => {
    try {
      const newItem = await RyanProgRepository.create(item)
      set(state => ({ progItems: [newItem, ...state.progItems], error: null }))
      return newItem
    } catch (error) {
      set({ error: formatErrorMessage(error) })
      throw error
    }
  },

  updateProgItem: async (itemId, updates) => {
    try {
      await RyanProgRepository.update(itemId, updates)
      set(state => ({
        progItems: state.progItems.map(p =>
          p.id === itemId ? { ...p, ...updates } : p
        ),
        error: null,
      }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  deleteProgItem: async (itemId) => {
    try {
      await RyanProgRepository.delete(itemId)
      set(state => ({
        progItems: state.progItems.filter(p => p.id !== itemId),
        error: null,
      }))
    } catch (error) {
      set({ error: formatErrorMessage(error) })
    }
  },

  getLateTasks: () => get().tasks.filter(t => t.status === 'en_retard'),

  getArchivedTasks: () => get().tasks.filter(t => t.status === 'terminee'),

  // Recherche locale instantanée
  searchTasks: async (query) => {
    const { userId } = get()
    if (!userId) return []
    try {
      return await TaskRepository.search(userId, query)
    } catch (error) {
      set({ error: formatErrorMessage(error) })
      return []
    }
  },

  searchProgItems: async (query) => {
    const { userId } = get()
    if (!userId) return []
    try {
      return await RyanProgRepository.search(userId, query)
    } catch (error) {
      set({ error: formatErrorMessage(error) })
      return []
    }
  },

  getStats: (): GlobalStats => {
    const tasks = get().tasks
    const now = new Date()
    const currentYear = now.getFullYear()

    const monthlyData: MonthStats[] = Array.from({ length: 12 }, (_, month) => {
      const monthTasks = tasks.filter(t => {
        const date = parseISO(t.created_at)
        return date.getFullYear() === currentYear && date.getMonth() === month
      })
      const created = monthTasks.length
      const done = monthTasks.filter(t => t.status === 'terminee').length
      const fail = monthTasks.filter(t => t.result === 'echec').length
      const late = monthTasks.filter(t => t.status === 'en_retard').length
      const rate = done > 0 ? Math.round(((done - fail) / done) * 100) : 0
      return { month, year: currentYear, created, done, fail, late, rate }
    })

    const totalCreated = tasks.length
    const totalDone = tasks.filter(t => t.status === 'terminee').length
    const totalFail = tasks.filter(t => t.result === 'echec').length
    const totalLate = tasks.filter(t => t.status === 'en_retard').length
    const globalRate = totalDone > 0
      ? Math.round(((totalDone - totalFail) / totalDone) * 100)
      : 0

    const activeMo = monthlyData.filter(m => m.created > 0)
    const bestMonth = activeMo.length > 0
      ? activeMo.reduce((best, m) => m.rate > best.rate ? m : best)
      : null
    const worstMonth = activeMo.length > 0
      ? activeMo.reduce((worst, m) => m.rate < worst.rate ? m : worst)
      : null

    // Calcul streak
    let streak = 0
    const checkDate = startOfDay(new Date())
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasCompleted = tasks.some(t =>
        t.completed_at && t.completed_at.startsWith(dateStr)
      )
      if (!hasCompleted) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return {
      totalCreated,
      totalDone,
      totalFail,
      totalLate,
      globalRate,
      streak,
      bestMonth,
      worstMonth,
      monthlyData,
    }
  },
}))