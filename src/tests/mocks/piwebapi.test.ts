import { describe, it, expect, beforeEach } from 'vitest'
import {
  enableMock,
  disableMock,
  isMockEnabled,
  resetMockState,
  setMockUser,
  mockGetUserInfo,
  mockSearchPoints,
  mockListDataFrames,
  mockCreateDataFrame,
  mockDeleteDataFrame,
  addMockDataFrame,
  mockListColumns,
  mockCreateColumn,
  mockDeleteColumn,
} from './piwebapi'

describe('mock', () => {
  beforeEach(() => {
    resetMockState()
    disableMock()
  })

  describe('enableMock/disableMock', () => {
    it('starts disabled', () => {
      expect(isMockEnabled()).toBe(false)
    })

    it('can be enabled', () => {
      enableMock()
      expect(isMockEnabled()).toBe(true)
    })

    it('can be disabled', () => {
      enableMock()
      disableMock()
      expect(isMockEnabled()).toBe(false)
    })
  })

  describe('mockGetUserInfo', () => {
    it('returns default mock user', async () => {
      enableMock({ delay: 0 })
      const user = await mockGetUserInfo()

      expect(user.Name).toBe('COMPANY\\testuser')
      expect(user.IsAuthenticated).toBe(true)
      expect(user.SID).toContain('S-1-5-21')
    })

    it('returns custom mock user', async () => {
      enableMock({ delay: 0 })
      setMockUser({ Name: 'ACME\\admin', SID: 'S-1-5-21-custom' })

      const user = await mockGetUserInfo()

      expect(user.Name).toBe('ACME\\admin')
      expect(user.SID).toBe('S-1-5-21-custom')
    })
  })

  describe('mockSearchPoints', () => {
    it('returns empty array for short query', async () => {
      enableMock({ delay: 0 })
      const results = await mockSearchPoints('a')
      expect(results).toEqual([])
    })

    it('returns matching points for valid query', async () => {
      enableMock({ delay: 0 })
      const results = await mockSearchPoints('sin')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]?.Name).toBe('SINUSOID')
    })

    it('is case insensitive', async () => {
      enableMock({ delay: 0 })
      const results = await mockSearchPoints('SINUSOID')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]?.Name).toBe('SINUSOID')
    })
  })

  describe('mockDataFrames', () => {
    it('lists empty dataframes initially', async () => {
      enableMock({ delay: 0 })
      const dfs = await mockListDataFrames()
      expect(dfs).toEqual([])
    })

    it('creates a dataframe', async () => {
      enableMock({ delay: 0 })
      const df = await mockCreateDataFrame(
        { name: 'test_df', description: 'Test DF' },
        'S-1-5-21-1234'
      )

      expect(df.name).toBe('TEST_DF')
      expect(df.description).toBe('Test DF')
      expect(df.permissions.mode).toBe('PRIVATE')
      expect(df.permissions.ownerSid).toBe('S-1-5-21-1234')
    })

    it('lists created dataframes', async () => {
      enableMock({ delay: 0 })
      await mockCreateDataFrame({ name: 'df1' }, 'sid1')
      await mockCreateDataFrame({ name: 'df2' }, 'sid1')

      const dfs = await mockListDataFrames()
      expect(dfs.length).toBe(2)
    })

    it('deletes a dataframe', async () => {
      enableMock({ delay: 0 })
      const df = await mockCreateDataFrame({ name: 'to_delete' }, 'sid1')

      await mockDeleteDataFrame(df.id)

      const dfs = await mockListDataFrames()
      expect(dfs.length).toBe(0)
    })

    it('adds pre-existing dataframe', async () => {
      enableMock({ delay: 0 })
      addMockDataFrame({
        id: 'existing-id',
        name: 'EXISTING',
        permissions: { mode: 'PUBLIC', ownerSid: 'sid' },
        metadata: {},
      })

      const dfs = await mockListDataFrames()
      expect(dfs.length).toBe(1)
      expect(dfs[0]?.id).toBe('existing-id')
    })
  })

  describe('mockColumns', () => {
    it('lists empty columns for new dataframe', async () => {
      enableMock({ delay: 0 })
      const cols = await mockListColumns('df1')
      expect(cols).toEqual([])
    })

    it('creates a column', async () => {
      enableMock({ delay: 0 })
      const col = await mockCreateColumn('df1', {
        name: 'temperature',
        valueSourceType: 'PiTag',
        valueSource: '\\\\SERVER\\TAG',
      })

      expect(col.name).toBe('temperature')
      expect(col.valueSourceType).toBe('PiTag')
      expect(col.valueSource).toBe('\\\\SERVER\\TAG')
      expect(col.order).toBe(0)
    })

    it('lists created columns', async () => {
      enableMock({ delay: 0 })
      await mockCreateColumn('df1', { name: 'col1', valueSourceType: 'PiTag' })
      await mockCreateColumn('df1', { name: 'col2', valueSourceType: 'FixedValue', valueSource: '42' })

      const cols = await mockListColumns('df1')
      expect(cols.length).toBe(2)
      expect(cols[0]?.order).toBe(0)
      expect(cols[1]?.order).toBe(1)
    })

    it('keeps columns separate by dataframe', async () => {
      enableMock({ delay: 0 })
      await mockCreateColumn('df1', { name: 'col1', valueSourceType: 'PiTag' })
      await mockCreateColumn('df2', { name: 'col2', valueSourceType: 'PiTag' })

      expect((await mockListColumns('df1')).length).toBe(1)
      expect((await mockListColumns('df2')).length).toBe(1)
    })

    it('deletes a column', async () => {
      enableMock({ delay: 0 })
      const col = await mockCreateColumn('df1', { name: 'to_delete', valueSourceType: 'PiTag' })

      await mockDeleteColumn('df1', col.id)

      const cols = await mockListColumns('df1')
      expect(cols.length).toBe(0)
    })
  })
})
