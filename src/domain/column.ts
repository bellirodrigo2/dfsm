/**
 * Column domain types
 */

export type ValueSourceType = 'PiTag' | 'FixedValue' | 'Formula'

export interface ColumnMetadata {
  [key: string]: unknown
}

export interface Column {
  id: string              // WebId of the AF Attribute
  name: string
  valueSourceType: ValueSourceType
  valueSource?: string    // Tag name, literal value, or expression
  valueType?: string      // Inferred from source (read-only)
  metadata: ColumnMetadata
  order: number           // Position in the DataFrame
}

export interface CreateColumnInput {
  name: string
  valueSourceType: ValueSourceType
  valueSource?: string
  metadata?: ColumnMetadata
}

export interface UpdateColumnInput {
  name?: string
  valueSourceType?: ValueSourceType
  valueSource?: string
  metadata?: ColumnMetadata
}

/**
 * Validate Column name
 * - Not empty
 * - No invalid AF attribute characters
 * - Max length 255
 */
export function validateColumnName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' }
  }

  if (name.length > 255) {
    return { valid: false, error: 'Name must be 255 characters or less' }
  }

  // AF Attribute invalid characters: * ? ; { } [ ] | \ ` ' "
  const invalidChars = /[*?;{}\[\]|\\`'"]/
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Get display label for value source type
 */
export function getValueSourceTypeLabel(type: ValueSourceType): string {
  switch (type) {
    case 'PiTag':
      return 'PI Tag'
    case 'FixedValue':
      return 'Fixed Value'
    case 'Formula':
      return 'Formula'
    default:
      return type
  }
}

/**
 * Validate value source based on type
 */
export function validateValueSource(
  type: ValueSourceType,
  value?: string
): { valid: boolean; error?: string } {
  if (type === 'PiTag' && (!value || value.trim().length === 0)) {
    return { valid: false, error: 'Tag reference is required for PI Tag source' }
  }

  if (type === 'FixedValue' && value === undefined) {
    return { valid: false, error: 'Value is required for Fixed Value source' }
  }

  if (type === 'Formula' && (!value || value.trim().length === 0)) {
    return { valid: false, error: 'Expression is required for Formula source' }
  }

  return { valid: true }
}
