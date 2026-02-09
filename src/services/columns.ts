import type { Column, CreateColumnInput, UpdateColumnInput } from '../domain/column'
import { validateColumnName, validateValueSource } from '../domain/column'
import {
  listColumns as apiListColumns,
  getColumn as apiGetColumn,
  createColumn as apiCreateColumn,
  updateColumn as apiUpdateColumn,
  deleteColumn as apiDeleteColumn,
} from '../piwebapi'

/**
 * List all columns for a DataFrame
 */
export async function listDataFrameColumns(dataframeId: string): Promise<Column[]> {
  return apiListColumns(dataframeId)
}

/**
 * Get a single column by ID
 */
export async function getColumnById(id: string): Promise<Column> {
  return apiGetColumn(id)
}

/**
 * Create a new column in a DataFrame
 */
export async function createNewColumn(
  dataframeId: string,
  input: CreateColumnInput
): Promise<Column> {
  // Validate name
  const nameValidation = validateColumnName(input.name)
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error)
  }

  // Validate value source
  const sourceValidation = validateValueSource(input.valueSourceType, input.valueSource)
  if (!sourceValidation.valid) {
    throw new Error(sourceValidation.error)
  }

  return apiCreateColumn(dataframeId, input)
}

/**
 * Update an existing column
 */
export async function updateExistingColumn(
  id: string,
  input: UpdateColumnInput
): Promise<Column> {
  // Validate name if provided
  if (input.name !== undefined) {
    const nameValidation = validateColumnName(input.name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }
  }

  // Validate value source if type or source changed
  if (input.valueSourceType !== undefined || input.valueSource !== undefined) {
    // Need to get current column to validate properly
    const current = await apiGetColumn(id)
    const newType = input.valueSourceType ?? current.valueSourceType
    const newSource = input.valueSource ?? current.valueSource

    const sourceValidation = validateValueSource(newType, newSource)
    if (!sourceValidation.valid) {
      throw new Error(sourceValidation.error)
    }
  }

  return apiUpdateColumn(id, input)
}

/**
 * Delete a column
 */
export async function removeColumn(id: string): Promise<void> {
  return apiDeleteColumn(id)
}
