/**
 * Contract Tests - DataFrames
 * Tests DataFrame operations against real PI Web API
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { setupContractTests } from './setup'
import { createTestDataFrameName } from '../utils/test-naming'
import { trackCreatedElement, getTestRootWebId } from '../utils/test-cleanup'
import {
  createDataFrame,
  getDataFrame,
  updateDataFrame,
  deleteDataFrame,
  listDataFrames,
} from '../../src/piwebapi/dataframes'
import type { CreateDataFrameInput } from '../../src/domain/dataframe'

setupContractTests()

describe('PI Web API Contract - DataFrames', () => {
  let testUserElementWebId: string

  beforeAll(() => {
    // Use test root as user element for these tests
    testUserElementWebId = getTestRootWebId()
  })

  it('should create a DataFrame with unique name', async () => {
    const testDfName = createTestDataFrameName('production_metrics')

    const input: CreateDataFrameInput = {
      name: testDfName,
      description: 'Test DataFrame for contract tests',
      permissions: 'PRIVATE',
      metadata: { test: true, purpose: 'contract_test' },
    }

    const df = await createDataFrame(testUserElementWebId, input, 'TEST_SID_123')

    // Track for cleanup
    trackCreatedElement(df.id)

    // Validate response
    expect(df).toBeDefined()
    expect(df.id).toBeDefined()
    expect(df.name).toBe(testDfName)
    expect(df.description).toBe(input.description)
    expect(df.permissions.mode).toBe('PRIVATE')
    expect(df.permissions.ownerSid).toBe('TEST_SID_123')
    expect(df.metadata).toEqual(input.metadata)
  })

  it('should retrieve DataFrame by WebId', async () => {
    // Create a test DataFrame
    const testDfName = createTestDataFrameName('retrieve_test')
    const input: CreateDataFrameInput = {
      name: testDfName,
      description: 'DataFrame for retrieval test',
    }

    const created = await createDataFrame(testUserElementWebId, input, 'TEST_SID_456')
    trackCreatedElement(created.id)

    // Retrieve it
    const retrieved = await getDataFrame(created.id)

    expect(retrieved.id).toBe(created.id)
    expect(retrieved.name).toBe(created.name)
    expect(retrieved.description).toBe(created.description)
  })

  it('should list DataFrames under user element', async () => {
    // Create multiple test DataFrames
    const df1Name = createTestDataFrameName('list_test_1')
    const df2Name = createTestDataFrameName('list_test_2')

    const df1 = await createDataFrame(
      testUserElementWebId,
      { name: df1Name },
      'TEST_SID_789'
    )
    trackCreatedElement(df1.id)

    const df2 = await createDataFrame(
      testUserElementWebId,
      { name: df2Name },
      'TEST_SID_789'
    )
    trackCreatedElement(df2.id)

    // List all DataFrames
    const dataframes = await listDataFrames(testUserElementWebId)

    expect(dataframes).toBeDefined()
    expect(Array.isArray(dataframes)).toBe(true)

    // Should include our created DataFrames
    const df1Found = dataframes.find((df) => df.id === df1.id)
    const df2Found = dataframes.find((df) => df.id === df2.id)

    expect(df1Found).toBeDefined()
    expect(df2Found).toBeDefined()
  })

  it('should update DataFrame metadata', async () => {
    const testDfName = createTestDataFrameName('update_test')
    const created = await createDataFrame(
      testUserElementWebId,
      { name: testDfName, metadata: { version: 1 } },
      'TEST_SID_UPDATE'
    )
    trackCreatedElement(created.id)

    // Update metadata
    const updated = await updateDataFrame(created.id, {
      metadata: { version: 2, updated: true },
    })

    expect(updated.metadata).toEqual({ version: 2, updated: true })
  })

  it('should update DataFrame description', async () => {
    const testDfName = createTestDataFrameName('description_test')
    const created = await createDataFrame(
      testUserElementWebId,
      { name: testDfName, description: 'Original description' },
      'TEST_SID_DESC'
    )
    trackCreatedElement(created.id)

    // Update description
    const updated = await updateDataFrame(created.id, {
      description: 'Updated description',
    })

    expect(updated.description).toBe('Updated description')
  })

  it('should delete DataFrame', async () => {
    const testDfName = createTestDataFrameName('delete_test')
    const created = await createDataFrame(
      testUserElementWebId,
      { name: testDfName },
      'TEST_SID_DELETE'
    )

    // Delete it
    await deleteDataFrame(created.id)

    // Try to retrieve - should fail
    await expect(getDataFrame(created.id)).rejects.toThrow()
  })

  it('should handle reserved metadata attributes correctly', async () => {
    const testDfName = createTestDataFrameName('reserved_meta_test')
    const created = await createDataFrame(
      testUserElementWebId,
      {
        name: testDfName,
        metadata: {
          _RESERVED_KEY_: 'should be stored',
          normalKey: 'also stored',
        },
      },
      'TEST_SID_META'
    )
    trackCreatedElement(created.id)

    expect(created.metadata).toHaveProperty('_RESERVED_KEY_')
    expect(created.metadata).toHaveProperty('normalKey')
  })
})
