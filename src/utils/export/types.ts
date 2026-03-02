/**
 * Export utilities for DataFrame data
 * Extensible system for multiple export formats
 */

import type { Table } from 'apache-arrow'

/**
 * Supported export formats
 * Add new formats here as they are implemented
 */
export type ExportFormat = 'xlsx' | 'csv' | 'arrow'
// Future: 'parquet' | 'json' | 'feather'

/**
 * Options for exporting data
 */
export interface ExportOptions {
  filename: string
  format: ExportFormat
}

/**
 * Interface for export format handlers
 * Each format implements this interface
 */
export interface ExportHandler {
  /**
   * Export an Arrow table to the specific format
   * Returns a Blob ready for download
   */
  export(table: Table, filename: string): Promise<Blob>

  /**
   * Get the file extension for this format
   */
  getExtension(): string

  /**
   * Get the MIME type for this format
   */
  getMimeType(): string
}

/**
 * Registry of export handlers
 * Allows adding new formats without modifying existing code
 */
export class ExportRegistry {
  private static handlers = new Map<ExportFormat, ExportHandler>()

  static register(format: ExportFormat, handler: ExportHandler): void {
    this.handlers.set(format, handler)
  }

  static getHandler(format: ExportFormat): ExportHandler {
    const handler = this.handlers.get(format)
    if (!handler) {
      throw new Error(`No export handler registered for format: ${format}`)
    }
    return handler
  }

  static getSupportedFormats(): ExportFormat[] {
    return Array.from(this.handlers.keys())
  }
}

/**
 * Generate a timestamp string in the format YYYYMMDD_HHMMSS
 */
function getCurrentTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

/**
 * Export an Arrow table to the specified format and trigger download
 */
export async function exportTable(
  table: Table,
  options: ExportOptions
): Promise<void> {
  const handler = ExportRegistry.getHandler(options.format)
  const blob = await handler.export(table, options.filename)

  // Generate filename with timestamp: <name>_<timestamp>.<ext>
  const timestamp = getCurrentTimestamp()
  const filename = `${options.filename}_${timestamp}.${handler.getExtension()}`

  // Trigger browser download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Cleanup
  URL.revokeObjectURL(url)
}
