/**
 * Naming utilities for AF elements
 * Handles username normalization and name sanitization
 */

import { getConfig } from '../app/config'

/**
 * Normalize Windows username for AF Element naming
 *
 * Example:
 *   COMPANY\john.doe → COMPANY_JOHN.DOE
 *
 * @param username - Windows username in format DOMAIN\username
 * @returns Normalized name suitable for AF Element
 */
export function normalizeUsername(username: string): string {
  const config = getConfig()

  let normalized = username

  // Replace backslash with configured character (default: underscore)
  if (config.af.naming.userName.replaceBackslashWith) {
    normalized = normalized.replace(/\\/g, config.af.naming.userName.replaceBackslashWith)
  }

  // Convert to uppercase if configured
  if (config.af.naming.userName.uppercase) {
    normalized = normalized.toUpperCase()
  }

  // Sanitize
  normalized = sanitizeAfName(normalized)

  return normalized
}

/**
 * Sanitize a name for use as AF Element or Attribute name
 * Removes invalid characters and applies length limits
 *
 * @param name - Original name
 * @returns Sanitized name
 */
export function sanitizeAfName(name: string): string {
  const config = getConfig()

  let sanitized = name

  // Collapse whitespace if configured
  if (config.af.naming.sanitize.collapseWhitespace) {
    sanitized = sanitized.replace(/\s+/g, '_')
  }

  // Remove invalid AF characters: * ? ; { } [ ] | \ ` ' "
  sanitized = sanitized.replace(/[*?;{}\[\]|\\`'"]/g, '')

  // Apply max length
  const maxLength = config.af.naming.sanitize.maxNameLength
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // Trim trailing underscores
  sanitized = sanitized.replace(/_+$/, '')

  return sanitized
}

/**
 * Validate AF Element name
 *
 * @param name - Name to validate
 * @returns Validation result
 */
export function validateAfElementName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' }
  }

  const config = getConfig()
  const maxLength = config.af.naming.sanitize.maxNameLength

  if (name.length > maxLength) {
    return { valid: false, error: `Name must be ${maxLength} characters or less` }
  }

  // Check for invalid characters
  const invalidChars = /[*?;{}\[\]|\\`'"]/
  if (invalidChars.test(name)) {
    return {
      valid: false,
      error: 'Name contains invalid characters: * ? ; { } [ ] | \\ ` \' "'
    }
  }

  return { valid: true }
}

/**
 * Extract domain and username from Windows identity
 *
 * @param identity - Windows identity (DOMAIN\username)
 * @returns Parsed domain and username
 */
export function parseWindowsIdentity(identity: string): { domain: string; username: string } {
  const parts = identity.split('\\')

  if (parts.length === 2) {
    return {
      domain: parts[0].trim(),
      username: parts[1].trim(),
    }
  }

  // No domain specified, treat entire string as username
  return {
    domain: '',
    username: identity.trim(),
  }
}
