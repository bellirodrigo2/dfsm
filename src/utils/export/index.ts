/**
 * Export utilities for DataFrame data
 * Central registry and initialization of all export formats
 */

export * from './types'
export { CsvExportHandler } from './csv-exporter'
export { XlsxExportHandler } from './xlsx-exporter'
export { ArrowExportHandler } from './arrow-exporter'

import { ExportRegistry } from './types'
import { CsvExportHandler } from './csv-exporter'
import { XlsxExportHandler } from './xlsx-exporter'
import { ArrowExportHandler } from './arrow-exporter'

/**
 * Initialize all export handlers
 * Call this once during app initialization
 */
export function initializeExporters(): void {
  ExportRegistry.register('csv', new CsvExportHandler())
  ExportRegistry.register('xlsx', new XlsxExportHandler())
  ExportRegistry.register('arrow', new ArrowExportHandler())

  // Future formats can be registered here:
  // ExportRegistry.register('parquet', new ParquetExportHandler())
  // ExportRegistry.register('json', new JsonExportHandler())
}
