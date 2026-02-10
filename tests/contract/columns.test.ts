/**
 * Contract Tests - Columns
 * Tests Column operations against real PI Web API
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { setupContractTests } from './setup'
import { createTestDataFrameName, createTestColumnName } from '../utils/test-naming'
import { trackCreatedElement, getTestRootWebId } from '../utils/test-cleanup'
import { createDataFrame } from '../../src/piwebapi/dataframes'
import {
  createColumn,
  listColumns,
  getColumn,
  updateColumn,
  deleteColumn,
} from '../../src/piwebapi/columns'
import type { CreateColumnInput } from '../../src/domain/column'

setupContractTests()

describe('PI Web API Contract - Columns', () => {
  let testDataFrameWebId: string

  beforeAll(async () => {
    // Create a test DataFrame for column tests
    const testDfName = createTestDataFrameName('columns_test_df')
    const df = await createDataFrame(
      getTestRootWebId(),
      { name: testDfName },
      'TEST_SID_COLUMNS'
    )
    testDataFrameWebId = df.id
    trackCreatedElement(df.id)
  })

  it('should create a column with PiTag source', async () => {
    const columnName = createTestColumnName('temperature')

    const input: CreateColumnInput = {
      name: columnName,
      valueSourceType: 'PiTag',
      valueSource: '\\\\PISRV01\\SINUSOID',
      engineeringUnit: 'deg C',
      metadata: { sensor: 'T-001' },
    }

    const column = await createColumn(testDataFrameWebId, input)

    expect(column).toBeDefined()
    expect(column.id).toBeDefined()
    expect(column.name).toBe(columnName)
    expect(column.valueSourceType).toBe('PiTag')
    expect(column.valueSource).toBe(input.valueSource)
    expect(column.engineeringUnit).toBe('deg C')
    expect(column.metadata).toEqual(input.metadata)
  })

  it('should create a column with FixedValue source', async () => {
    const columnName = createTestColumnName('setpoint')

    const input: CreateColumnInput = {
      name: columnName,
      valueSourceType: 'FixedValue',
      valueSource: '42',
      metadata: { type: 'constant' },
    }

    const column = await createColumn(testDataFrameWebId, input)

    expect(column.valueSourceType).toBe('FixedValue')
    expect(column.valueSource).toBe('42')
  })

  it('should list columns in DataFrame', async () => {
    const columns = await listColumns(testDataFrameWebId)

    expect(columns).toBeDefined()
    expect(Array.isArray(columns)).toBe(true)

    // Should have at least the columns we created
    expect(columns.length).toBeGreaterThan(0)

    // Each column should have required fields
    columns.forEach((col) => {
      expect(col.id).toBeDefined()
      expect(col.name).toBeDefined()
      expect(col.valueSourceType).toBeDefined()
      expect(typeof col.order).toBe('number')
    })
  })

  it('should retrieve column by WebId', async () => {
    const columnName = createTestColumnName('pressure')
    const created = await createColumn(testDataFrameWebId, {
      name: columnName,
      valueSourceType: 'PiTag',
      valueSource: '\\\\PISRV01\\CDT158',
    })

    const retrieved = await getColumn(created.id)

    expect(retrieved.id).toBe(created.id)
    expect(retrieved.name).toBe(created.name)
    expect(retrieved.valueSourceType).toBe(created.valueSourceType)
  })

  it('should update column metadata', async () => {
    const columnName = createTestColumnName('flow_rate')
    const created = await createColumn(testDataFrameWebId, {
      name: columnName,
      valueSourceType: 'PiTag',
      valueSource: '\\\\PISRV01\\SINUSOID',
      metadata: { version: 1 },
    })

    const updated = await updateColumn(created.id, {
      metadata: { version: 2, updated: true },
    })

    expect(updated.metadata).toEqual({ version: 2, updated: true })
  })

  it('should update column value source', async () => {
    const columnName = createTestColumnName('level')
    const created = await createColumn(testDataFrameWebId, {
      name: columnName,
      valueSourceType: 'PiTag',
      valueSource: '\\\\PISRV01\\TAG1',
    })

    const updated = await updateColumn(created.id, {
      valueSource: '\\\\PISRV01\\TAG2',
    })

    expect(updated.valueSource).toBe('\\\\PISRV01\\TAG2')
  })

  it('should delete column', async () => {
    const columnName = createTestColumnName('delete_me')
    const created = await createColumn(testDataFrameWebId, {
      name: columnName,
      valueSourceType: 'FixedValue',
      valueSource: '0',
    })

    await deleteColumn(created.id)

    // Try to retrieve - should fail
    await expect(getColumn(created.id)).rejects.toThrow()
  })

  it('should preserve column order', async () => {
    const col1Name = createTestColumnName('ordered_col_1')
    const col2Name = createTestColumnName('ordered_col_2')
    const col3Name = createTestColumnName('ordered_col_3')

    await createColumn(testDataFrameWebId, {
      name: col1Name,
      valueSourceType: 'FixedValue',
      valueSource: '1',
    })

    await createColumn(testDataFrameWebId, {
      name: col2Name,
      valueSourceType: 'FixedValue',
      valueSource: '2',
    })

    await createColumn(testDataFrameWebId, {
      name: col3Name,
      valueSourceType: 'FixedValue',
      valueSource: '3',
    })

    const columns = await listColumns(testDataFrameWebId)

    // Find our columns
    const col1 = columns.find((c) => c.name === col1Name)
    const col2 = columns.find((c) => c.name === col2Name)
    const col3 = columns.find((c) => c.name === col3Name)

    expect(col1).toBeDefined()
    expect(col2).toBeDefined()
    expect(col3).toBeDefined()

    // Order should be preserved
    expect(col1!.order).toBeLessThan(col2!.order)
    expect(col2!.order).toBeLessThan(col3!.order)
  })

  it('should handle column with Formula source', async () => {
    const columnName = createTestColumnName('calculated')

    const input: CreateColumnInput = {
      name: columnName,
      valueSourceType: 'Formula',
      valueSource: 'TagAvg("SINUSOID", "*-1h", "*")',
      metadata: { formula_type: 'af_native' },
    }

    const column = await createColumn(testDataFrameWebId, input)

    expect(column.valueSourceType).toBe('Formula')
    expect(column.valueSource).toBe(input.valueSource)
  })
})
