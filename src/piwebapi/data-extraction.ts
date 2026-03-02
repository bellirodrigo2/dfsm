import { tableFromArrays, tableToIPC as arrowTableToIPC, type Table, Float64, TimestampMillisecond } from 'apache-arrow'
import type { DataFrame } from '../domain/dataframe'
import type { Column } from '../domain/column'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import { getTagByPath } from './tags'

/**
 * PI Web API StreamSet response for interpolated data
 */
interface PiStreamValue {
  Timestamp: string
  Value: number | string | boolean | null
  UnitsAbbreviation?: string
  Good: boolean
  Questionable: boolean
  Substituted: boolean
  Annotated: boolean
}

interface PiStreamSetResponse {
  Links: Record<string, unknown>
  Items: PiStreamValue[]
}

/**
 * Options for data extraction
 */
export interface DataExtractionOptions {
  startTime: string  // ISO 8601 or PI time format (e.g., "*-1d")
  endTime: string    // ISO 8601 or PI time format (e.g., "*")
  interval: string   // PI time format (e.g., "1h", "30m", "1d")
}

/**
 * Result of data extraction with Arrow table
 */
export interface DataExtractionResult {
  table: Table
  stats: {
    totalRows: number
    nullCounts: Record<string, number>  // column name -> null count
  }
}

/**
 * Supported data types for columns
 * Currently only Float64, but designed to be extensible
 */
type SupportedDataType = 'Float64' // | 'Int32' | 'Utf8' | 'Boolean' - future types

/**
 * Get the appropriate Arrow data type for a column
 * Currently defaults to Float64, but structured for easy extension
 */
function getArrowDataType(column: Column): SupportedDataType {
  // Future: inspect column.valueType or metadata to determine type
  // For now, default to Float64 for PI Tags
  if (column.valueSourceType === 'PiTag') {
    return 'Float64'
  }
  return 'Float64'
}

/**
 * Parse a value to Float64 with proper error handling
 * Returns null if value cannot be parsed or is invalid
 */
function parseFloat64(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed
  }

  // Boolean or other types - return null
  return null
}

/**
 * Determine if a stream value should be marked as null based on quality flags
 */
function shouldMarkAsNull(item: PiStreamValue, parsedValue: number | null): boolean {
  // Null if value failed to parse
  if (parsedValue === null) {
    return true
  }

  // Null if quality flags indicate bad data
  if (!item.Good || item.Questionable) {
    return true
  }

  return false
}

/**
 * Extract interpolated data for a single PI Tag column
 */
async function extractColumnData(
  column: Column,
  options: DataExtractionOptions,
  clientOptions?: PiWebApiClientOptions
): Promise<{ values: Array<number | null>; timestamps: Date[]; nullCount: number }> {
  if (column.valueSourceType !== 'PiTag' || !column.valueSource) {
    throw new Error(`Column ${column.name} is not a PI Tag or missing valueSource`)
  }

  // Resolve tag path to WebId
  // valueSource contains the PI Tag path (e.g., \\SERVER\TAG)
  let pointWebId: string

  // Check if valueSource is already a WebId (starts with specific PI Web API pattern)
  // WebIds typically look like: F1AbEfLbwwL8F6EiShqE38H1bA...
  if (column.valueSource.match(/^[A-Za-z0-9_-]{20,}$/)) {
    // Already a WebId
    pointWebId = column.valueSource
  } else {
    // It's a path, resolve it
    const tag = await getTagByPath(column.valueSource, clientOptions)
    pointWebId = tag.id
  }

  // Build streamset interpolated URL
  const url = `streams/${encodeURIComponent(pointWebId)}/interpolated?` +
    `startTime=${encodeURIComponent(options.startTime)}&` +
    `endTime=${encodeURIComponent(options.endTime)}&` +
    `interval=${encodeURIComponent(options.interval)}`

  const response = await piWebApiRequest<PiStreamSetResponse>(url, clientOptions)

  const values: Array<number | null> = []
  const timestamps: Date[] = []
  let nullCount = 0

  for (const item of response.Items) {
    // Parse timestamp
    timestamps.push(new Date(item.Timestamp))

    // Parse value based on data type
    const dataType = getArrowDataType(column)
    let parsedValue: number | null = null

    if (dataType === 'Float64') {
      parsedValue = parseFloat64(item.Value)
    }
    // Future: handle other data types here

    // Check if should be null based on quality or parse failure
    if (shouldMarkAsNull(item, parsedValue)) {
      values.push(null)
      nullCount++
    } else {
      values.push(parsedValue)
    }
  }

  return { values, timestamps, nullCount }
}

/**
 * Extract data from a DataFrame using PI Web API streamset interpolated
 * Converts to Apache Arrow format with proper null handling
 */
export async function extractDataFrameData(
  _dataframe: DataFrame,
  columns: Column[],
  options: DataExtractionOptions,
  clientOptions?: PiWebApiClientOptions
): Promise<DataExtractionResult> {
  // Filter only PI Tag columns
  const piTagColumns = columns.filter(col => col.valueSourceType === 'PiTag')

  if (piTagColumns.length === 0) {
    throw new Error('No PI Tag columns found in DataFrame')
  }

  // Extract data for all columns in parallel
  const columnDataPromises = piTagColumns.map(col =>
    extractColumnData(col, options, clientOptions)
  )

  const columnDataResults = await Promise.all(columnDataPromises)

  // Build Arrow table
  // Use the first column's timestamps as the reference
  const referenceTimestamps = columnDataResults[0]?.timestamps ?? []

  // Prepare data for Arrow table
  const arrowData: Record<string, any> = {
    timestamp: referenceTimestamps,
  }

  const nullCounts: Record<string, number> = {}

  piTagColumns.forEach((col, idx) => {
    const result = columnDataResults[idx]!
    arrowData[col.name] = result.values
    nullCounts[col.name] = result.nullCount
  })

  // Define Arrow schema
  const arrowFields: Record<string, any> = {
    timestamp: new TimestampMillisecond(),
  }

  piTagColumns.forEach(col => {
    // Future: use getArrowDataType(col) to map other data types here
    arrowFields[col.name] = new Float64()
  })

  // Create Arrow table
  const table = tableFromArrays(arrowData)

  return {
    table,
    stats: {
      totalRows: referenceTimestamps.length,
      nullCounts,
    },
  }
}

/**
 * Serialize Arrow table to IPC format (for download/transfer)
 */
export function serializeArrowTable(table: Table): Uint8Array {
  // Arrow IPC format (Feather V2)
  return arrowTableToIPC(table)
}
