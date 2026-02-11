import type { Column, CreateColumnInput, UpdateColumnInput, ColumnMetadata } from '../domain/column'
import type { PiWebApiAttribute, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import { getConfig } from '../app/config'

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
 * Uses batch request to create attribute and retrieve it atomically
 */
export async function createColumn(
  dataframeWebId: string,
  input: CreateColumnInput,
  options?: PiWebApiClientOptions
): Promise<Column> {
  const config = getConfig()

  // Validate PI Tag exists if valueSourceType is PiTag
  if (input.valueSourceType === 'PiTag' && input.valueSource) {
    try {
      // Try to get the point to verify it exists
      const encodedPath = encodeURIComponent(input.valueSource)
      await piWebApiRequest(
        `points?path=${encodedPath}`,
        options
      )
    } catch (error) {
      throw new Error(`PI Tag not found: ${input.valueSource}`)
    }
  }

  // Prepare column config - only store custom metadata
  // valueSourceType, valueSource, and engineeringUnit are already in the attribute itself
  const columnConfig = input.metadata ?? {}

  // Create main column attribute with PI Point data reference
  // ConfigString must contain ONLY the PI tag path for PI Point plugin
  const batchPayload = {
    '1': {
      Method: 'POST',
      Resource: `${config.piWebApi.baseUrl}/elements/${dataframeWebId}/attributes`,
      Content: JSON.stringify({
        Name: input.name,
        Type: 'String',
        Description: buildColumnDescription(input),
        DataReferencePlugIn: 'PI Point',
        ConfigString: input.valueSource || '', // Just the tag path
      }),
    },
    '2': {
      Method: 'POST',
      Resource: '{0}/attributes',
      Parameters: ['$.1.Headers.Location'],
      ParentIds: ['1'],
      Content: JSON.stringify({
        Name: 'DSM__CONFIG',
        Type: 'String',
      }),
    },
    '3': {
      Method: 'PUT',
      Resource: '{0}/value',
      Parameters: ['$.2.Headers.Location'],
      ParentIds: ['2'],
      Content: JSON.stringify({
        Value: JSON.stringify(columnConfig),
      }),
    },
    '4': {
      Method: 'GET',
      Resource: '{0}',
      Parameters: ['$.1.Headers.Location'],
      ParentIds: ['3'],
    },
  }

  const batchResponse = await piWebApiRequest<Record<string, any>>('batch', {
    ...options,
    method: 'POST',
    json: batchPayload,
  })

  // Check if GET succeeded
  const getAttrResponse = batchResponse['4']

  if (!getAttrResponse || getAttrResponse.Status !== 200) {
    throw new Error(
      `Failed to create column: ${input.name}. ` +
        `Batch response: ${JSON.stringify(batchResponse)}`
    )
  }

  return fetchColumnDetails(getAttrResponse.Content, 0, options)
}

/**
 * Update an existing column
 */
export async function updateColumn(
  webId: string,
  input: UpdateColumnInput,
  options?: PiWebApiClientOptions
): Promise<Column> {
  // Note: We don't validate PI Tag existence on update because:
  // 1. It was already validated on creation
  // 2. The tag path might contain special characters that cause encoding issues
  // 3. Update operations should be more permissive

  // Prepare updates
  const updatePayload: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updatePayload.Name = input.name
  }

  // Update description if any source info changed
  if (input.valueSourceType !== undefined || input.valueSource !== undefined) {
    const descParts: string[] = []
    if (input.valueSourceType) {
      descParts.push(`[${input.valueSourceType}]`)
    }
    if (input.valueSource) {
      descParts.push(input.valueSource)
    }
    if (descParts.length > 0) {
      updatePayload.Description = descParts.join(' ')
    }
  }

  // Update ConfigString with the tag path if valueSource changed
  if (input.valueSource !== undefined) {
    updatePayload.ConfigString = input.valueSource
  }

  // Update main attribute if needed
  if (Object.keys(updatePayload).length > 0) {
    await piWebApiRequest(
      `attributes/${webId}`,
      {
        ...options,
        method: 'PATCH',
        json: updatePayload,
      }
    )
  }

  // Update DSM__CONFIG with custom metadata if provided
  if (input.metadata !== undefined) {
    await updateOrCreateConfigAttribute(webId, JSON.stringify(input.metadata), options)
  }

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
  // Try to get custom metadata from child DSM__CONFIG attribute
  // DSM__CONFIG now only stores custom user metadata (key-value pairs)
  let metadata: ColumnMetadata = {}

  try {
    // Fetch child attributes to find DSM__CONFIG
    const attributesResponse = await piWebApiRequest<PiWebApiItemsResponse<{ Name: string; Value: unknown }>>(
      `attributes/${attr.WebId}/attributes?selectedFields=Items.Name;Items.Value`,
      options
    )

    for (const childAttr of attributesResponse.Items) {
      if (childAttr.Name === 'DSM__CONFIG' && typeof childAttr.Value === 'string') {
        try {
          metadata = JSON.parse(childAttr.Value)
        } catch {
          // Invalid JSON
        }
        break
      }
    }
  } catch {
    // Config not available or no child attributes
  }

  // Parse description to extract valueSourceType and valueSource
  // Format: [Type] Source
  const desc = attr.Description || ''
  let valueSourceType: Column['valueSourceType'] = 'PiTag'
  let valueSource: string | undefined

  const typeMatch = desc.match(/^\[(\w+)\]/)
  if (typeMatch) {
    valueSourceType = typeMatch[1] as Column['valueSourceType']
  }

  // Extract source after the type
  const sourceMatch = desc.match(/\]\s+(.+)$/)
  if (sourceMatch && sourceMatch[1]) {
    valueSource = sourceMatch[1].trim()
  }

  return {
    id: attr.WebId,
    name: attr.Name,
    valueSourceType,
    valueSource,
    valueType: attr.Type,
    metadata,
    order,
  }
}

async function updateOrCreateConfigAttribute(
  attributeWebId: string,
  value: string,
  options?: PiWebApiClientOptions
): Promise<void> {
  const config = getConfig()

  // Try to find existing DSM__CONFIG child attribute
  const response = await piWebApiRequest<PiWebApiItemsResponse<{ WebId: string; Name: string }>>(
    `attributes/${attributeWebId}/attributes?nameFilter=DSM__CONFIG`,
    options
  )

  if (response.Items.length > 0) {
    // Update existing
    const configAttrWebId = response.Items[0]!.WebId
    await piWebApiRequest(
      `attributes/${configAttrWebId}/value`,
      {
        ...options,
        method: 'PUT',
        json: { Value: value },
      }
    )
  } else {
    // Create new using batch
    const batchPayload = {
      '1': {
        Method: 'POST',
        Resource: `${config.piWebApi.baseUrl}/attributes/${attributeWebId}/attributes`,
        Content: JSON.stringify({
          Name: 'DSM__CONFIG',
          Type: 'String',
        }),
      },
      '2': {
        Method: 'PUT',
        Resource: '{0}/value',
        Parameters: ['$.1.Headers.Location'],
        ParentIds: ['1'],
        Content: JSON.stringify({
          Value: value,
        }),
      },
    }

    await piWebApiRequest('batch', {
      ...options,
      method: 'POST',
      json: batchPayload,
    })
  }
}

function buildColumnDescription(input: CreateColumnInput): string {
  const parts: string[] = []
  parts.push(`[${input.valueSourceType}]`)
  if (input.valueSource) {
    parts.push(input.valueSource)
  }
  return parts.join(' ')
}
