/**
 * DataFrame domain types
 */

export type PermissionMode = 'PRIVATE' | 'PUBLIC' | 'SHARED'

export interface DataFramePermissions {
  mode: PermissionMode
  ownerSid: string
  read?: string[]  // SIDs with read access (for SHARED)
  write?: string[] // SIDs with write access (for SHARED)
}

export interface DataFrameMetadata {
  [key: string]: unknown
}

export interface DataFrame {
  id: string           // WebId
  name: string
  description?: string
  permissions: DataFramePermissions
  metadata: DataFrameMetadata
  createdAt?: string
  modifiedAt?: string
}

export interface CreateDataFrameInput {
  name: string
  description?: string
  permissions?: PermissionMode
  metadata?: DataFrameMetadata
}

export interface UpdateDataFrameInput {
  name?: string
  description?: string
  permissions?: DataFramePermissions
  metadata?: DataFrameMetadata
}

/**
 * Validate DataFrame name
 * - Not empty
 * - No invalid AF characters
 * - Max length 255
 */
export function validateDataFrameName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' }
  }

  if (name.length > 255) {
    return { valid: false, error: 'Name must be 255 characters or less' }
  }

  // AF invalid characters: * ? ; { } [ ] | \ ` ' "
  const invalidChars = /[*?;{}\[\]|\\`'"]/
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Validate metadata key
 * Reserved keys start and end with underscore
 */
export function isReservedMetadataKey(key: string): boolean {
  return key.startsWith('_') && key.endsWith('_')
}
