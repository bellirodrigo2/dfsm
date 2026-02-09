/**
 * Normalized API error shape
 * UI components must never depend on raw HTTP status codes
 */
export type ApiErrorKind =
  | 'Auth'
  | 'NotFound'
  | 'Validation'
  | 'Conflict'
  | 'RateLimit'
  | 'Network'
  | 'Server'
  | 'Unknown'

export interface ApiError {
  kind: ApiErrorKind
  message: string
  retryable: boolean
  status?: number
}

export function createApiError(
  kind: ApiErrorKind,
  message: string,
  status?: number
): ApiError {
  const retryable = kind === 'Network' || kind === 'RateLimit' || kind === 'Server'
  return { kind, message, retryable, status }
}

export function mapHttpStatusToErrorKind(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'Auth'
  if (status === 404) return 'NotFound'
  if (status === 400 || status === 422) return 'Validation'
  if (status === 409) return 'Conflict'
  if (status === 429) return 'RateLimit'
  if (status >= 500) return 'Server'
  return 'Unknown'
}
