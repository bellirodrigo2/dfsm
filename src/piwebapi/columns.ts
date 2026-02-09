import type { Column, CreateColumnInput, UpdateColumnInput, ColumnMetadata } from '../domain/column'
import type { PiWebApiAttribute, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'

// Reserved attribute prefix for DSM internal use
const DSM_PREFIX = 'DSM__'

/**
 * List all columns (attributes) for a DataFrame element
 * Filters out DSM reserved attributes
 */
export async function listColumns(
  dataframeWebId: string,
  options?: PiWebApiClientOptions
): Promise<Column[]> {
  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiAttribute>>(
    `elements/${dataframeWebId}/attributes`,
    options
  )

  const columns: Column[] = []
  let order = 0

  for (const attr of response.Items) {
    // Skip DSM reserved attributes
    if (attr.Name.startsWith(DSM_PREFIX)) {
      continue
    }

    const column = await fetchColumnDetails(attr, order, options)
    columns.push(column)
    order++
  }

  return columns
}

/**
 * Get a single column by WebId
 */
export async function getColumn(
  webId: string,
  options?: PiWebApiClientOptions
): Promise<Column> {
  const attr = await piWebApiRequest<PiWebApiAttribute>(
    `attributes/${webId}`,
    options
  )
  return fetchColumnDetails(attr, 0, options)
}

/**
 * Create a new column (attribute) on a DataFrame element
 */
export async function createColumn(
  dataframeWebId: string,
  input: CreateColumnInput,
  options?: PiWebApiClientOptions
): Promise<Column> {
  // Build attribute payload
  const attrPayload: Record<string, unknown> = {
    Name: input.name,
    Type: 'String', // Default type, will be inferred from source later
    Description: buildColumnDescription(input),
  }

  // Store column config in ConfigString (PI AF pattern for attribute configuration)
  attrPayload.ConfigString = JSON.stringify({
    valueSourceType: input.valueSourceType,
    valueSource: input.valueSource,
    engineeringUnit: input.engineeringUnit,
    metadata: input.metadata ?? {},
  })

  await piWebApiRequest(
    `elements/${dataframeWebId}/attributes`,
    {
      ...options,
      method: 'POST',
      json: attrPayload,
    }
  )

  // Find the created attribute by name
  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiAttribute>>(
    `elements/${dataframeWebId}/attributes?nameFilter=${encodeURIComponent(input.name)}`,
    options
  )

  if (response.Items.length === 0) {
    throw new Error('Failed to find created column attribute')
  }

  return getColumn(response.Items[0]!.WebId, options)
}

/**
 * Update an existing column
 */
export async function updateColumn(
  webId: string,
  input: UpdateColumnInput,
  options?: PiWebApiClientOptions
): Promise<Column> {
  // Get current attribute to merge config
  const current = await piWebApiRequest<PiWebApiAttribute & { ConfigString?: string }>(
    `attributes/${webId}`,
    options
  )

  let currentConfig: Record<string, unknown> = {}
  if (current.ConfigString) {
    try {
      currentConfig = JSON.parse(current.ConfigString)
    } catch {
      // Invalid JSON, start fresh
    }
  }

  // Merge updates
  const updatePayload: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updatePayload.Name = input.name
  }

  // Update config string with new values
  const newConfig = {
    ...currentConfig,
    ...(input.valueSourceType !== undefined && { valueSourceType: input.valueSourceType }),
    ...(input.valueSource !== undefined && { valueSource: input.valueSource }),
    ...(input.engineeringUnit !== undefined && { engineeringUnit: input.engineeringUnit }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
  }

  updatePayload.ConfigString = JSON.stringify(newConfig)
  updatePayload.Description = buildColumnDescriptionFromConfig(newConfig)

  await piWebApiRequest(
    `attributes/${webId}`,
    {
      ...options,
      method: 'PATCH',
      json: updatePayload,
    }
  )

  return getColumn(webId, options)
}

/**
 * Delete a column
 */
export async function deleteColumn(
  webId: string,
  options?: PiWebApiClientOptions
): Promise<void> {
  await piWebApiRequest(
    `attributes/${webId}`,
    {
      ...options,
      method: 'DELETE',
    }
  )
}

// Helper functions

async function fetchColumnDetails(
  attr: PiWebApiAttribute,
  order: number,
  options?: PiWebApiClientOptions
): Promise<Column> {
  // Try to get extended attribute info with ConfigString
  let configString: string | undefined
  try {
    const fullAttr = await piWebApiRequest<PiWebApiAttribute & { ConfigString?: string }>(
      `attributes/${attr.WebId}?selectedFields=ConfigString`,
      options
    )
    configString = fullAttr.ConfigString
  } catch {
    // ConfigString not available
  }

  let config: {
    valueSourceType?: string
    valueSource?: string
    engineeringUnit?: string
    metadata?: ColumnMetadata
  } = {}

  if (configString) {
    try {
      config = JSON.parse(configString)
    } catch {
      // Invalid JSON
    }
  }

  return {
    id: attr.WebId,
    name: attr.Name,
    valueSourceType: (config.valueSourceType as Column['valueSourceType']) ?? 'PiTag',
    valueSource: config.valueSource,
    engineeringUnit: config.engineeringUnit,
    valueType: attr.Type,
    metadata: config.metadata ?? {},
    order,
  }
}

function buildColumnDescription(input: CreateColumnInput): string {
  const parts: string[] = []
  parts.push(`[${input.valueSourceType}]`)
  if (input.valueSource) {
    parts.push(input.valueSource)
  }
  if (input.engineeringUnit) {
    parts.push(`(${input.engineeringUnit})`)
  }
  return parts.join(' ')
}

function buildColumnDescriptionFromConfig(config: Record<string, unknown>): string {
  const parts: string[] = []
  if (config.valueSourceType) {
    parts.push(`[${config.valueSourceType}]`)
  }
  if (config.valueSource) {
    parts.push(String(config.valueSource))
  }
  if (config.engineeringUnit) {
    parts.push(`(${config.engineeringUnit})`)
  }
  return parts.join(' ')
}
