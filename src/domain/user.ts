/**
 * User identity from PI Web API /system/userinfo
 */
export interface UserInfo {
  identityType: string
  name: string
  isAuthenticated: boolean
  sid: string
}

/**
 * Normalized username for AF element naming
 * e.g., COMPANY\USER -> COMPANY_USER
 */
export function normalizeUsername(name: string, replaceWith = '_', uppercase = true): string {
  let normalized = name.replace(/\\/g, replaceWith)
  if (uppercase) {
    normalized = normalized.toUpperCase()
  }
  return normalized
}
