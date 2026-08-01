import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { useTaskStore } from '../store/taskStore'
import { SyncEngine } from '../lib/sync/SyncEngine'
import { TaskRepository } from '../lib/repositories/TaskRepository'
import { syncQueue } from '../lib/sync/SyncQueue'
import { db } from '../lib/database/sqlite'
import { supabase } from '../lib/supabase'

jest.mock('../lib/repositories/TaskRepository', () => ({
  TaskRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    complete: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  },
}))

jest.mock('../lib/repositories/RyanProgRepository', () => ({
  RyanProgRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  },
}))

jest.mock('../lib/sync/SyncQueue', () => ({
  syncQueue: {
    resetFailed: jest.fn(),
    getPending: jest.fn(),
    markProcessing: jest.fn(),
    markDone: jest.fn(),
    markFailed: jest.fn(),
  },
}))

jest.mock('../lib/database/sqlite', () => ({
  db: {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  },
}))

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}))

const mockedTaskRepository = TaskRepository as any
const mockedSyncQueue = syncQueue as any
const mockedDb = db as any
const mockedSupabase = supabase as any

beforeEach(() => {
  jest.clearAllMocks()
  useTaskStore.setState({
    tasks: [],
    progItems: [],
    loading: false,
    userId: null,
  })
})

describe('taskStore core logic', () => {
  it('marks a task as succeeded when the deadline is still in the future', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    const task = {
      id: 'task-1',
      user_id: 'user-1',
      title: 'Test task',
      description: null,
      priority: 'moyenne' as const,
      status: 'active' as const,
      deadline_date: futureDate.toISOString().split('T')[0],
      deadline_time: null,
      reminder_enabled: false,
      notification_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      result: null,
    }

    useTaskStore.setState({ tasks: [task] })
    mockedTaskRepository.complete.mockResolvedValueOnce(undefined)

    await useTaskStore.getState().completeTask(task.id)

    expect(mockedTaskRepository.complete).toHaveBeenCalledWith(task.id, 'reussi')
    expect(useTaskStore.getState().tasks[0].status).toBe('terminee')
    expect(useTaskStore.getState().tasks[0].result).toBe('reussi')
  })

  it('marks a task as failed when the deadline is already in the past', async () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    const task = {
      id: 'task-2',
      user_id: 'user-1',
      title: 'Late task',
      description: null,
      priority: 'urgente' as const,
      status: 'active' as const,
      deadline_date: pastDate.toISOString().split('T')[0],
      deadline_time: null,
      reminder_enabled: false,
      notification_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      result: null,
    }

    useTaskStore.setState({ tasks: [task] })
    mockedTaskRepository.complete.mockResolvedValueOnce(undefined)

    await useTaskStore.getState().completeTask(task.id)

    expect(mockedTaskRepository.complete).toHaveBeenCalledWith(task.id, 'echec')
    expect(useTaskStore.getState().tasks[0].result).toBe('echec')
  })

  it('removes a task from state after deletion', async () => {
    const task = {
      id: 'task-3',
      user_id: 'user-1',
      title: 'Delete me',
      description: null,
      priority: 'basse' as const,
      status: 'active' as const,
      deadline_date: '2026-08-10',
      deadline_time: null,
      reminder_enabled: false,
      notification_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      result: null,
    }

    useTaskStore.setState({ tasks: [task] })
    mockedTaskRepository.delete.mockResolvedValueOnce(undefined as unknown)

    await useTaskStore.getState().deleteTask(task.id)

    expect(mockedTaskRepository.delete).toHaveBeenCalledWith(task.id)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })
})

describe('sync engine', () => {
  it('marks a successful action as done', async () => {
    mockedSyncQueue.resetFailed.mockResolvedValueOnce(undefined)
    mockedSyncQueue.getPending.mockResolvedValueOnce([
      {
        id: 'queue-1',
        entity: 'tasks',
        action: 'insert',
        local_id: 'local-1',
        payload: JSON.stringify({ title: 'Sync me' }),
        status: 'pending',
        retries: 0,
        last_error: null,
        created_at: new Date().toISOString(),
      },
    ])
    mockedSyncQueue.markProcessing.mockResolvedValueOnce(undefined)
    mockedSyncQueue.markDone.mockResolvedValueOnce(undefined)
    mockedSyncQueue.markFailed.mockResolvedValueOnce(undefined)
    mockedDb.getFirstAsync.mockResolvedValueOnce(undefined)
    mockedDb.runAsync.mockResolvedValueOnce({} as never)

    const insertChain: any = {
      select: jest.fn() as any,
      single: jest.fn() as any,
    }
    insertChain.select.mockReturnValue({ select: insertChain.select, single: insertChain.single })
    insertChain.select.mockReturnValue({
      single: insertChain.single.mockResolvedValue({ data: { id: 'server-1' }, error: null }),
    })
    const fromMock = jest.fn().mockReturnValue({ insert: jest.fn().mockReturnValue(insertChain) })
    mockedSupabase.from.mockImplementation(fromMock as unknown as any)

    await SyncEngine.pushLocalChanges()

    expect(mockedSyncQueue.markDone).toHaveBeenCalledWith('queue-1')
    expect(mockedSyncQueue.markFailed).not.toHaveBeenCalled()
  })

  it('does not crash when an action fails and marks it as failed', async () => {
    mockedSyncQueue.resetFailed.mockResolvedValueOnce(undefined)
    mockedSyncQueue.getPending.mockResolvedValueOnce([
      {
        id: 'queue-2',
        entity: 'tasks',
        action: 'insert',
        local_id: 'local-2',
        payload: JSON.stringify({ title: 'Fail me' }),
        status: 'pending',
        retries: 0,
        last_error: null,
        created_at: new Date().toISOString(),
      },
    ])
    mockedSyncQueue.markProcessing.mockResolvedValueOnce(undefined)
    mockedSyncQueue.markDone.mockResolvedValueOnce(undefined)
    mockedSyncQueue.markFailed.mockResolvedValueOnce(undefined)
    mockedDb.getFirstAsync.mockResolvedValueOnce(undefined)

    const insertChain: any = {
      select: jest.fn() as any,
      single: jest.fn() as any,
    }
    insertChain.select.mockReturnValue({
      single: insertChain.single.mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })
    const fromMock = jest.fn().mockReturnValue({ insert: jest.fn().mockReturnValue(insertChain) })
    mockedSupabase.from.mockImplementation(fromMock as unknown as any)

    await expect(SyncEngine.pushLocalChanges()).resolves.toBeUndefined()

    expect(mockedSyncQueue.markFailed).toHaveBeenCalledWith('queue-2', expect.any(String))
  })
})
