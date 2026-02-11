import type { DataFrame, CreateDataFrameInput, UpdateDataFrameInput, DataFramePermissions, DataFrameMetadata } from '../domain/dataframe'
import type { PiWebApiElement, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import { getConfig } from '../app/config'

/**
 * List all DataFrames for a user element
 * Filters out DSM__METADATA child elements
 */
export async function listDataFrames(
  userElementWebId: string,
  options?: PiWebApiClientOptions
): Promise<DataFrame[]> {
  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
    `elements/${userElementWebId}/elements`,
    options
  )

  const dataframes: DataFrame[] = []
  for (const element of response.Items) {
    // Skip DSM__METADATA elements
    if (element.Name === 'DSM__METADATA') {
      continue
    }

    const df = await fetchDataFrameDetails(element, options)
    dataframes.push(df)
  }

  return dataframes
}

/**
 * Get a single DataFrame by WebId
 */
export async function getDataFrame(
  webId: string,
  options?: PiWebApiClientOptions
): Promise<DataFrame> {
  const element = await piWebApiRequest<PiWebApiElement>(
    `elements/${webId}`,
    options
  )
  return fetchDataFrameDetails(element, options)
}

/**
 * Create a new DataFrame element under the user element
 * Uses batch requests to create element, metadata child element, and attributes atomically
 */
export async function createDataFrame(
  userElementWebId: string,
  input: CreateDataFrameInput,
  ownerSid: string,
  options?: PiWebApiClientOptions
): Promise<DataFrame> {
  const config = getConfig()

  // Prepare permissions
  const permissions: DataFramePermissions = {
    mode: input.permissions ?? 'PRIVATE',
    ownerSid,
  }

  // Build batch payload
  const batchPayload: Record<string, any> = {
    // 1. Create main DataFrame element
    '1': {
      Method: 'POST',
      Resource: `${config.piWebApi.baseUrl}/elements/${userElementWebId}/elements`,
      Content: JSON.stringify({
        Name: input.name.toUpperCase(),
        Description: input.description ?? '',
      }),
    },
    // 2. Create DSM__METADATA child element
    '2': {
      Method: 'POST',
      Resource: '{0}/elements',
      Parameters: ['$.1.Headers.Location'],
      ParentIds: ['1'],
      Content: JSON.stringify({
        Name: 'DSM__METADATA',
        Description: 'DSM system metadata',
      }),
    },
    // 3. Create PERMISSIONS_JSON attribute on metadata element
    '3': {
      Method: 'POST',
      Resource: '{0}/attributes',
      Parameters: ['$.2.Headers.Location'],
      ParentIds: ['2'],
      Content: JSON.stringify({
        Name: config.af.reservedAttributes.permissionsJson,
        Type: 'String',
      }),
    },
    // 4. Set permissions value
    '4': {
      Method: 'PUT',
      Resource: '{0}/value',
      Parameters: ['$.3.Headers.Location'],
      ParentIds: ['3'],
      Content: JSON.stringify({
        Value: JSON.stringify(permissions),
      }),
    },
  }

  let nextId = 5

  // Add metadata attribute if provided
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    // Create METADATA_JSON attribute
    batchPayload[nextId.toString()] = {
      Method: 'POST',
      Resource: '{0}/attributes',
      Parameters: ['$.2.Headers.Location'],
      ParentIds: ['4'],
      Content: JSON.stringify({
        Name: config.af.reservedAttributes.metadataJson,
        Type: 'String',
      }),
    }
    nextId++

    // Set metadata value
    batchPayload[nextId.toString()] = {
      Method: 'PUT',
      Resource: '{0}/value',
      Parameters: [`$.${nextId - 1}.Headers.Location`],
      ParentIds: [(nextId - 1).toString()],
      Content: JSON.stringify({
        Value: JSON.stringify(input.metadata),
      }),
    }
    nextId++
  }

  // Final GET to retrieve the created element
  batchPayload[nextId.toString()] = {
    Method: 'GET',
    Resource: '{0}',
    Parameters: ['$.1.Headers.Location'],
    ParentIds: [(nextId - 1).toString()],
  }

  const finalRequestId = nextId.toString()

  // Execute batch request
  const batchResponse = await piWebApiRequest<Record<string, any>>('batch', {
    ...options,
    method: 'POST',
    json: batchPayload,
  })

  // Check if final GET succeeded
  const getElementResponse = batchResponse[finalRequestId]

  if (!getElementResponse || getElementResponse.Status !== 200) {
    throw new Error(
      `Failed to create DataFrame: ${input.name}. ` +
        `Batch response: ${JSON.stringify(batchResponse)}`
    )
  }

  return fetchDataFrameDetails(getElementResponse.Content, options)
}

/**
 * Update a DataFrame
 */
export async function updateDataFrame(
  webId: string,
  input: UpdateDataFrameInput,
  options?: PiWebApiClientOptions
): Promise<DataFrame> {
  const config = getConfig()

  // Update element name/description if provided
  if (input.name !== undefined || input.description !== undefined) {
    const updatePayload: Record<string, string> = {}
    if (input.name !== undefined) {
      updatePayload.Name = input.name.toUpperCase()
    }
    if (input.description !== undefined) {
      updatePayload.Description = input.description
    }

    await piWebApiRequest(
      `elements/${webId}`,
      {
        ...options,
        method: 'PATCH',
        json: updatePayload,
      }
    )
  }

  // Update permissions or metadata if provided
  if (input.permissions !== undefined || input.metadata !== undefined) {
    // Get or create DSM__METADATA element
    const metadataElementWebId = await getOrCreateMetadataElement(webId, options)

    // Update permissions if provided
    if (input.permissions !== undefined) {
      await updateOrCreateAttributeOnElement(
        metadataElementWebId,
        config.af.reservedAttributes.permissionsJson,
        JSON.stringify(input.permissions),
        options
      )
    }

    // Update metadata if provided
    if (input.metadata !== undefined) {
      await updateOrCreateAttributeOnElement(
        metadataElementWebId,
        config.af.reservedAttributes.metadataJson,
        JSON.stringify(input.metadata),
        options
      )
    }
  }

  return getDataFrame(webId, options)
}

/**
 * Delete a DataFrame
 */
export async function deleteDataFrame(
  webId: string,
  options?: PiWebApiClientOptions
): Promise<void> {
  await piWebApiRequest(
    `elements/${webId}`,
    {
      ...options,
      method: 'DELETE',
    }
  )
}

// Helper functions

async function fetchDataFrameDetails(
  element: PiWebApiElement,
  options?: PiWebApiClientOptions
): Promise<DataFrame> {
  const config = getConfig()

  let permissions: DataFramePermissions = {
    mode: 'PRIVATE',
    ownerSid: '',
  }
  let metadata: DataFrameMetadata = {}

  try {
    // Fetch child elements to find DSM__METADATA
    const elementsResponse = await piWebApiRequest<PiWebApiItemsResponse<{ WebId: string; Name: string }>>(
      `elements/${element.WebId}/elements?nameFilter=DSM__METADATA`,
      options
    )

    if (elementsResponse.Items.length > 0) {
      const metadataElementWebId = elementsResponse.Items[0]!.WebId

      // Fetch attributes from metadata element
      const attributesResponse = await piWebApiRequest<PiWebApiItemsResponse<{ Name: string; Value: unknown }>>(
        `elements/${metadataElementWebId}/attributes?selectedFields=Items.Name;Items.Value`,
        options
      )

      for (const attr of attributesResponse.Items) {
        if (attr.Name === config.af.reservedAttributes.permissionsJson && typeof attr.Value === 'string') {
          try {
            permissions = JSON.parse(attr.Value)
          } catch {
            // Invalid JSON, use defaults
          }
        }
        if (attr.Name === config.af.reservedAttributes.metadataJson && typeof attr.Value === 'string') {
          try {
            metadata = JSON.parse(attr.Value)
          } catch {
            // Invalid JSON, use defaults
          }
        }
      }
    }
  } catch {
    // Metadata element not found or error fetching, use defaults
  }

  return {
    id: element.WebId,
    name: element.Name,
    description: element.Description,
    permissions,
    metadata,
  }
}

/**
 * Get or create the DSM__METADATA child element for a DataFrame
 */
async function getOrCreateMetadataElement(
  dataframeWebId: string,
  options?: PiWebApiClientOptions
): Promise<string> {
  // Try to find existing DSM__METADATA element
  const response = await piWebApiRequest<PiWebApiItemsResponse<{ WebId: string; Name: string }>>(
    `elements/${dataframeWebId}/elements?nameFilter=DSM__METADATA`,
    options
  )

  if (response.Items.length > 0) {
    return response.Items[0]!.WebId
  }

  // Create new metadata element
  const createResponse = await piWebApiRequest<{ WebId: string }>(
    `elements/${dataframeWebId}/elements`,
    {
      ...options,
      method: 'POST',
      json: {
        Name: 'DSM__METADATA',
        Description: 'DSM system metadata',
      },
    }
  )

  return createResponse.WebId
}

/**
 * Update or create an attribute on an element
 */
async function updateOrCreateAttributeOnElement(
  elementWebId: string,
  attributeName: string,
  value: string,
  options?: PiWebApiClientOptions
): Promise<void> {
  // Try to find existing attribute
  const response = await piWebApiRequest<PiWebApiItemsResponse<{ WebId: string; Name: string }>>(
    `elements/${elementWebId}/attributes?nameFilter=${encodeURIComponent(attributeName)}`,
    options
  )

  if (response.Items.length > 0) {
    // Update existing
    const attrWebId = response.Items[0]!.WebId
    await piWebApiRequest(
      `attributes/${attrWebId}/value`,
      {
        ...options,
        method: 'PUT',
        json: { Value: value },
      }
    )
  } else {
    // Create new using batch (can't set Value on POST)
    const config = getConfig()
    const batchPayload = {
      '1': {
        Method: 'POST',
        Resource: `${config.piWebApi.baseUrl}/elements/${elementWebId}/attributes`,
        Content: JSON.stringify({
          Name: attributeName,
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
