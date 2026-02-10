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

  // Create the user element
  const elementPayload = {
    Name: normalizedName,
    Description: `User element for ${userInfo.name}`,
  }

  await piWebApiRequest(`elements/${rootWebId}/elements`, {
    ...options,
    method: 'POST',
    json: elementPayload,
  })

  // Find the created element
  const createdElement = await findUserElement(rootWebId, normalizedName, options)

  if (!createdElement) {
    throw new Error(`Failed to find created user element: ${normalizedName}`)
  }

  // Store user metadata (SID and creation timestamp)
  const userMetadata = {
    sid: userInfo.sid,
    identityType: userInfo.identityType,
    originalName: userInfo.name,
    createdAt: new Date().toISOString(),
  }

  // Create metadata attribute
  await piWebApiRequest(`elements/${createdElement.WebId}/attributes`, {
    ...options,
    method: 'POST',
    json: {
      Name: config.af.reservedAttributes.metadataJson,
      Type: 'String',
      Value: JSON.stringify(userMetadata),
    },
  })

  return createdElement.WebId
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
