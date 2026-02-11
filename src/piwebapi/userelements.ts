/**
 * User Elements Management
 * Handles creation and resolution of User Elements in AF
 */

import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import type { PiWebApiElement, PiWebApiItemsResponse } from './types'
import type { UserInfo } from '../domain/user'
import { normalizeUsername } from '../domain/naming'
import { getAfRootWebId } from './afroot'
import { getConfig } from '../app/config'

/**
 * Get or create a User Element for the authenticated user
 * This is the main entry point for user element management
 *
 * @param userInfo - User information from PI Web API
 * @param options - Request options
 * @returns User element WebId
 */
export async function getOrCreateUserElement(
  userInfo: UserInfo,
  options?: PiWebApiClientOptions
): Promise<string> {
  const rootWebId = await getAfRootWebId(options)
  const normalizedName = normalizeUsername(userInfo.name)

  // Try to find existing user element
  const existingElement = await findUserElement(rootWebId, normalizedName, options)

  if (existingElement) {
    return existingElement.WebId
  }

  // Create new user element
  return await createUserElement(rootWebId, normalizedName, userInfo, options)
}

/**
 * Find a user element by normalized name
 *
 * @param rootWebId - Root element WebId
 * @param normalizedName - Normalized username
 * @param options - Request options
 * @returns User element if found, null otherwise
 */
async function findUserElement(
  rootWebId: string,
  normalizedName: string,
  options?: PiWebApiClientOptions
): Promise<PiWebApiElement | null> {
  try {
    const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
      `elements/${rootWebId}/elements?nameFilter=${encodeURIComponent(normalizedName)}`,
      options
    )

    // Find exact match (nameFilter is case-insensitive and uses wildcards)
    const exactMatch = response.Items.find(
      (el) => el.Name.toUpperCase() === normalizedName.toUpperCase()
    )

    return exactMatch || null
  } catch (error) {
    // If error, assume element doesn't exist
    return null
  }
}

/**
 * Create a new user element
 * Uses batch requests to create element and attribute atomically
 *
 * @param rootWebId - Root element WebId
 * @param normalizedName - Normalized username
 * @param userInfo - User information
 * @param options - Request options
 * @returns Created element WebId
 */
async function createUserElement(
  rootWebId: string,
  normalizedName: string,
  userInfo: UserInfo,
  options?: PiWebApiClientOptions
): Promise<string> {
  const config = getConfig()

  // Prepare user metadata
  const userMetadata = {
    sid: userInfo.sid,
    identityType: userInfo.identityType,
    originalName: userInfo.name,
    createdAt: new Date().toISOString(),
  }

  // Use batch request to create element and attribute atomically
  // Batch requests require full URLs in the first request
  // Reference: https://community.aveva.com/pi-square-community/b/aveva-blog/posts/pi-web-api-2015-r3-new-features-demo-batch-and-channels-c
  const batchPayload = {
    '1': {
      Method: 'POST',
      Resource: `${config.piWebApi.baseUrl}/elements/${rootWebId}/elements`,
      Content: JSON.stringify({
        Name: normalizedName,
        Description: `User element for ${userInfo.name}`,
      }),
    },
    '2': {
      Method: 'POST',
      Resource: '{0}/attributes',
      Parameters: ['$.1.Headers.Location'],
      ParentIds: ['1'],
      Content: JSON.stringify({
        Name: config.af.reservedAttributes.metadataJson,
        Type: 'String',
        // Value cannot be set on creation
      }),
    },
    '3': {
      Method: 'PUT',
      Resource: '{0}/value',
      Parameters: ['$.2.Headers.Location'],
      ParentIds: ['2'],
      Content: JSON.stringify({
        Value: JSON.stringify(userMetadata),
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

  // Extract WebId from the response
  const getElementResponse = batchResponse['4']

  if (!getElementResponse || getElementResponse.Status !== 200) {
    throw new Error(
      `Failed to create user element: ${normalizedName}. ` +
        `Batch response: ${JSON.stringify(batchResponse)}`
    )
  }

  return getElementResponse.Content.WebId
}

/**
 * Get user element WebId by user info
 * Throws if element doesn't exist
 *
 * @param userInfo - User information
 * @param options - Request options
 * @returns User element WebId
 */
export async function getUserElementWebId(
  userInfo: UserInfo,
  options?: PiWebApiClientOptions
): Promise<string> {
  const rootWebId = await getAfRootWebId(options)
  const normalizedName = normalizeUsername(userInfo.name)

  const element = await findUserElement(rootWebId, normalizedName, options)

  if (!element) {
    throw new Error(
      `User element not found: ${normalizedName}. ` +
        `Call getOrCreateUserElement() to create it.`
    )
  }

  return element.WebId
}

/**
 * Check if a user element exists
 *
 * @param userInfo - User information
 * @param options - Request options
 * @returns True if element exists
 */
export async function userElementExists(
  userInfo: UserInfo,
  options?: PiWebApiClientOptions
): Promise<boolean> {
  const rootWebId = await getAfRootWebId(options)
  const normalizedName = normalizeUsername(userInfo.name)

  const element = await findUserElement(rootWebId, normalizedName, options)
  return element !== null
}

/**
 * List all user elements under root
 *
 * @param options - Request options
 * @returns Array of user elements
 */
export async function listUserElements(
  options?: PiWebApiClientOptions
): Promise<PiWebApiElement[]> {
  const rootWebId = await getAfRootWebId(options)

  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
    `elements/${rootWebId}/elements?maxCount=1000`,
    options
  )

  return response.Items
}
