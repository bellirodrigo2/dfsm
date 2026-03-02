/**
 * CSV Export Handler
 * Exports Arrow tables to CSV format with configurable regional settings
 */

import type { Table } from 'apache-arrow'
import type { ExportHandler } from './types'
import { getConfig } from '../../app/config'

/**
 * Format a date according to the configured format string
 */
function formatDate(date: Date, format: string): string {
  const pad = (n: number) => n.toString().padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')

  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SSS', milliseconds)
}

/**
 * Format a number according to the configured decimal separator
 */
function formatNumber(value: number, decimalSeparator: string): string {
  const str = value.toString()
  return decimalSeparator === ',' ? str.replace('.', ',') : str
}

/**
 * Escape a field value for CSV
 */
function escapeField(
  value: string,
  delimiter: string,
  separator: string
): string {
  // If value contains delimiter, separator, or newline, wrap in delimiters
  if (
    value.includes(delimiter) ||
    value.includes(separator) ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    // Escape delimiters by doubling them
    const escaped = value.replace(new RegExp(delimiter, 'g'), delimiter + delimiter)
    return `${delimiter}${escaped}${delimiter}`
  }
  return value
}

export class CsvExportHandler implements ExportHandler {
  async export(table: Table, _filename: string): Promise<Blob> {
    const config = getConfig().export.csv
    const lines: string[] = []

    // Add headers if configured
    if (config.includeHeaders) {
      const headers = table.schema.fields.map(field =>
        escapeField(field.name, config.delimiter, config.separator)
      )
      lines.push(headers.join(config.separator))
    }

    // Process each row
    for (let rowIdx = 0; rowIdx < table.numRows; rowIdx++) {
      const row: string[] = []

      for (let colIdx = 0; colIdx < table.numCols; colIdx++) {
        const column = table.getChildAt(colIdx)!
        const value = column.get(rowIdx)

        let formatted: string

        if (value === null || value === undefined) {
          // Handle null values
          formatted = config.nullRepresentation
        } else if (value instanceof Date) {
          // Format dates
          formatted = formatDate(value, config.dateFormat)
        } else if (typeof value === 'number') {
          // Format numbers with decimal separator
          formatted = formatNumber(value, config.decimalSeparator)
        } else {
          // Convert to string
          formatted = String(value)
        }

        // Escape and add to row
        row.push(escapeField(formatted, config.delimiter, config.separator))
      }

      lines.push(row.join(config.separator))
    }

    // Join all lines
    const csvContent = lines.join('\n')

    // Create blob with appropriate encoding
    let blob: Blob
    if (config.encoding === 'utf-8-sig') {
      // Add BOM for Excel compatibility
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
      blob = new Blob([bom, csvContent], { type: this.getMimeType() })
    } else {
      blob = new Blob([csvContent], { type: this.getMimeType() })
    }

    return blob
  }

  getExtension(): string {
    return 'csv'
  }

  getMimeType(): string {
    return 'text/csv;charset=utf-8'
  }
}
