/**
 * Arrow Export Handler
 * Exports Arrow tables in native Arrow IPC format
 */

import type { Table } from 'apache-arrow'
import type { ExportHandler } from './types'
import { serializeArrowTable } from '../../piwebapi/data-extraction'

export class ArrowExportHandler implements ExportHandler {
  async export(table: Table, _filename: string): Promise<Blob> {
    const buffer = serializeArrowTable(table)
    return new Blob([buffer as any], { type: this.getMimeType() })
  }

  getExtension(): string {
    return 'arrow'
  }

  getMimeType(): string {
    return 'application/vnd.apache.arrow.file'
  }
}
