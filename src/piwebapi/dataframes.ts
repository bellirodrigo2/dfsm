import type { DataFrame, CreateDataFrameInput, UpdateDataFrameInput, DataFramePermissions, DataFrameMetadata } from '../domain/dataframe'
import type { PiWebApiElement, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import { getConfig } from '../app/config'

/**
 * List all DataFrames for a user element
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
 */
export async function createDataFrame(
  userElementWebId: string,
  input: CreateDataFrameInput,
  ownerSid: string,
  options?: PiWebApiClientOptions
): Promise<DataFrame> {
  const config = getConfig()

  // Create the element
  const elementPayload = {
    Name: input.name.toUpperCase(),
    Description: input.description ?? '',
  }

  await piWebApiRequest(
    `elements/${userElementWebId}/elements`,
    {
      ...options,
      method: 'POST',
      json: elementPayload,
    }
  )

  // Find the created element by name
  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
    `elements/${userElementWebId}/elements?nameFilter=${encodeURIComponent(input.name.toUpperCase())}`,
    options
  )

  if (response.Items.length === 0) {
    throw new Error('Failed to find created DataFrame element')
  }

  const createdElement = response.Items[0]!

  // Create permissions attribute
  const permissions: DataFramePermissions = {
    mode: input.permissions ?? 'PRIVATE',
    ownerSid,
  }

  await piWebApiRequest(
    `elements/${createdElement.WebId}/attributes`,
    {
      ...options,
      method: 'POST',
      json: {
        Name: config.af.reservedAttributes.permissionsJson,
        Type: 'String',
        Value: JSON.stringify(permissions),
      },
    }
  )

  // Create metadata attribute if provided
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    await piWebApiRequest(
      `elements/${createdElement.WebId}/attributes`,
      {
        ...options,
        method: 'POST',
        json: {
          Name: config.af.reservedAttributes.metadataJson,
          Type: 'String',
          Value: JSON.stringify(input.metadata),
        },
      }
    )
  }

  return getDataFrame(createdElement.WebId, options)
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

  // Update permissions if provided
  if (input.permissions !== undefined) {
    await updateOrCreateAttribute(
      webId,
      config.af.reservedAttributes.permissionsJson,
      JSON.stringify(input.permissions),
      options
    )
  }

  // Update metadata if provided
  if (input.metadata !== undefined) {
    await updateOrCreateAttribute(
      webId,
      config.af.reservedAttributes.metadataJson,
      JSON.stringify(input.metadata),
      options
    )
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

  // Fetch attributes to get permissions and metadata
  const attributesResponse = await piWebApiRequest<PiWebApiItemsResponse<{ Name: string; Value: unknown }>>(
    `elements/${element.WebId}/attributes?selectedFields=Items.Name;Items.Value`,
    options
  )

  let permissions: DataFramePermissions = {
    mode: 'PRIVATE',
    ownerSid: '',
  }
  let metadata: DataFrameMetadata = {}

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

  return {
    id: element.WebId,
    name: element.Name,
    description: element.Description,
    permissions,
    metadata,
  }
}

async function updateOrCreateAttribute(
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
    // Create new
    await piWebApiRequest(
      `elements/${elementWebId}/attributes`,
      {
        ...options,
        method: 'POST',
        json: {
          Name: attributeName,
          Type: 'String',
          Value: value,
        },
      }
    )
  }
}
