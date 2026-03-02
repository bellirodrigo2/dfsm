/**
 * XLSX Export Handler
 * Exports Arrow tables to Excel format with configurable regional settings
 */

import * as XLSX from 'xlsx'
import type { Table } from 'apache-arrow'
import type { ExportHandler } from './types'
import { getConfig } from '../../app/config'

/**
 * Format a number according to the configured decimal separator
 * For Excel, we keep numbers as numbers and let Excel format them
 */
function formatNumberForExcel(
  value: number,
  decimalSeparator: string
): number | string {
  // If using comma as decimal separator, we need to format as string
  // because Excel uses locale-specific formatting
  if (decimalSeparator === ',') {
    return value.toString().replace('.', ',')
  }
  return value
}

export class XlsxExportHandler implements ExportHandler {
  async export(table: Table, _filename: string): Promise<Blob> {
    const config = getConfig().export.xlsx

    // Convert Arrow table to array of objects
    const data: any[] = []

    // Build header row
    const headers = table.schema.fields.map(field => field.name)

    // Identify timestamp columns by checking field types
    const timestampColumns = new Set<number>()
    for (let colIdx = 0; colIdx < table.numCols; colIdx++) {
      const field = table.schema.fields[colIdx]!
      // Check if field type is a timestamp type
      if (field.type.toString().includes('Timestamp') || field.name.toLowerCase() === 'timestamp') {
        timestampColumns.add(colIdx)
      }
    }

    // Process each row
    for (let rowIdx = 0; rowIdx < table.numRows; rowIdx++) {
      const rowData: Record<string, any> = {}

      for (let colIdx = 0; colIdx < table.numCols; colIdx++) {
        const field = table.schema.fields[colIdx]!
        const column = table.getChildAt(colIdx)!
        const value = column.get(rowIdx)

        if (value === null || value === undefined) {
          // Handle null values
          rowData[field.name] = config.nullRepresentation
        } else if (timestampColumns.has(colIdx)) {
          // Convert timestamp (milliseconds or Date) to JavaScript Date
          if (value instanceof Date) {
            rowData[field.name] = value
          } else if (typeof value === 'number') {
            // Arrow timestamp in milliseconds
            rowData[field.name] = new Date(value)
          } else if (typeof value === 'bigint') {
            // Handle BigInt timestamps (Arrow may use BigInt for large numbers)
            rowData[field.name] = new Date(Number(value))
          } else {
            console.warn(`Unexpected timestamp value type: ${typeof value}`, value)
            rowData[field.name] = value
          }
        } else if (value instanceof Date) {
          // Keep as Date for Excel to format properly
          rowData[field.name] = value
        } else if (typeof value === 'number') {
          // Format numbers according to decimal separator
          rowData[field.name] = formatNumberForExcel(value, config.decimalSeparator)
        } else {
          rowData[field.name] = value
        }
      }

      data.push(rowData)
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: headers,
      cellDates: true // Important: tell xlsx to preserve Date objects
    })

    // Apply date format to timestamp columns
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (const colIdx of timestampColumns) {
      // Apply date format to entire column (skip header row)
      for (let rowIdx = 1; rowIdx <= range.e.r; rowIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
        const cell = worksheet[cellAddress]
        if (cell && (cell.t === 'd' || cell.v instanceof Date)) {
          // Apply the configured date format
          cell.z = config.dateFormat
        }
      }
    }

    // Set column widths (auto-size)
    const colWidths = headers.map(header => ({
      wch: Math.max(header.length, 12), // Minimum width of 12 characters
    }))
    worksheet['!cols'] = colWidths

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName)

    // Generate Excel file as array buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true,
    })

    // Create blob
    return new Blob([excelBuffer], { type: this.getMimeType() })
  }

  getExtension(): string {
    return 'xlsx'
  }

  getMimeType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
}
