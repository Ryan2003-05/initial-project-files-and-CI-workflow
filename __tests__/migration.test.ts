import { describe, it, expect, jest } from '@jest/globals'

describe('Database migrations', () => {
  it('applies next_attempt migration when user_version < 2', async () => {
    const execCalls: string[] = []

    const mockExecAsync = jest.fn(async (sql: string) => {
      execCalls.push(sql)
      const trimmed = (sql || '').trim()
      if (trimmed === 'PRAGMA user_version') {
        // Simulate current DB version = 1
        return [{ rows: { length: 1, item: (_: number) => ({ user_version: 1 }) } }]
      }
      // For PRAGMA user_version = N writes, just return empty
      return []
    })

    // Mock expo-sqlite before importing initDatabase
    jest.doMock('expo-sqlite', () => ({
      openDatabaseSync: () => ({ execAsync: mockExecAsync })
    }))

    // Import module after mocking (use require to avoid ESM dynamic import issues in Jest)
    const mod = require('../lib/database/sqlite')
    await mod.initDatabase()

    // Ensure migration SQL was executed and user_version bumped
    const ranMigration = execCalls.some(s => s.includes('ALTER TABLE sync_queue ADD COLUMN next_attempt'))
    const bumped = execCalls.some(s => s.includes('PRAGMA user_version = 2'))

    expect(ranMigration).toBe(true)
    expect(bumped).toBe(true)
  })
})
