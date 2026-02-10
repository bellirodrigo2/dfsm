/**
 * AF Root Element Resolution
 * Resolves the root element in AF Database where all DSM objects are stored
 */

import { piWebApiRequest, type PiWebApiClientOptions } from './client'
import type { PiWebApiElement } from './types'
import { getConfig } from '../app/config'

// Cached root WebId (valid for session)
let cachedRootWebId: string | null = null

/**
 * Get the AF root element WebId
 * Uses caching to avoid repeated resolution
 *
 * @param options - Request options
 * @returns Root element WebId
 */
export async function getAfRootWebId(options?: PiWebApiClientOptions): Promise<string> {
  if (cachedRootWebId) {
    return cachedRootWebId
  }

  cachedRootWebId = await resolveAfRootWebId(options)
  return cachedRootWebId
}

/**
 * Clear cached root WebId (for testing or reconfiguration)
 */
export function clearAfRootCache(): void {
  cachedRootWebId = null
}

/**
 * Resolve AF root element WebId from configuration
 * Tries primary strategy (WebId) first, then fallback (path)
 *
 * @param options - Request options
 * @returns Root element WebId
 */
async function resolveAfRootWebId(options?: PiWebApiClientOptions): Promise<string> {
  const config = getConfig()

  // Strategy 1: Try using WebId (fastest and most reliable)
  if (config.af.root.primary?.elementWebId) {
    try {
      const element = await piWebApiRequest<PiWebApiElement>(
        `elements/${config.af.root.primary.elementWebId}`,
        options
      )
      return element.WebId
    } catch (error) {
      const err = error as Error
      console.warn(`Failed to resolve AF root by WebId: ${err.message}`)
      console.warn('Falling back to path resolution...')
    }
  }

  // Strategy 2: Try resolving by path
  if (config.af.root.fallback) {
    try {
      return await resolveByPath(
        config.af.root.fallback.afServerName,
        config.af.root.fallback.databaseName,
        config.af.root.fallback.elementPath,
        options
      )
    } catch (error) {
      const err = error as Error
      throw new Error(
        `Failed to resolve AF root element.\n` +
          `  WebId: ${config.af.root.primary?.elementWebId || 'not configured'}\n` +
          `  Path: ${config.af.root.fallback.elementPath || 'not configured'}\n` +
          `  Error: ${err.message}\n\n` +
          `Please check:\n` +
          `  1. Configuration is correct\n` +
          `  2. AF Server and Database are accessible\n` +
          `  3. Root element exists\n` +
          `  4. You have permissions to access the element`
      )
    }
  }

  throw new Error(
    'AF root element not configured. ' +
      'Set either af.root.primary.elementWebId or af.root.fallback in configuration'
  )
}

/**
 * Resolve element by AF path
 *
 * @param serverName - AF Server name
 * @param databaseName - AF Database name
 * @param elementPath - Element path within database (e.g., \DSM_ROOT)
 * @param options - Request options
 * @returns Element WebId
 */
async function resolveByPath(
  serverName: string,
  databaseName: string,
  elementPath: string,
  options?: PiWebApiClientOptions
): Promise<string> {
  // Build full AF path: \\SERVER\DATABASE\ELEMENT_PATH
  const fullPath = `\\\\${serverName}\\${databaseName}${elementPath}`

  try {
    const element = await piWebApiRequest<PiWebApiElement>(
      `elements?path=${encodeURIComponent(fullPath)}`,
      options
    )

    return element.WebId
  } catch (error) {
    const err = error as Error
    throw new Error(
      `Failed to resolve element by path: ${fullPath}\n` +
        `Error: ${err.message}`
    )
  }
}

/**
 * Get AF Database WebId by server and database name
 *
 * @param serverName - AF Server name
 * @param databaseName - AF Database name
 * @param options - Request options
 * @returns Database WebId
 */
export async function getAfDatabaseWebId(
  serverName: string,
  databaseName: string,
  options?: PiWebApiClientOptions
): Promise<string> {
  const dbPath = `\\\\${serverName}\\${databaseName}`

  try {
    const database = await piWebApiRequest<PiWebApiElement>(
      `assetdatabases?path=${encodeURIComponent(dbPath)}`,
      options
    )

    return database.WebId
  } catch (error) {
    const err = error as Error
    throw new Error(
      `Failed to resolve AF Database: ${dbPath}\n` +
        `Error: ${err.message}`
    )
  }
}
