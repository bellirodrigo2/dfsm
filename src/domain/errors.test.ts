import { describe, it, expect } from 'vitest'
import { createApiError, mapHttpStatusToErrorKind } from './errors'

describe('createApiError', () => {
  it('creates error with correct shape', () => {
    const error = createApiError('NotFound', 'Resource not found', 404)

    expect(error).toEqual({
      kind: 'NotFound',
      message: 'Resource not found',
      retryable: false,
      status: 404,
    })
  })

  it('marks Network errors as retryable', () => {
    const error = createApiError('Network', 'Connection failed')
    expect(error.retryable).toBe(true)
  })

  it('marks RateLimit errors as retryable', () => {
    const error = createApiError('RateLimit', 'Too many requests')
    expect(error.retryable).toBe(true)
  })

  it('marks Server errors as retryable', () => {
    const error = createApiError('Server', 'Internal server error')
    expect(error.retryable).toBe(true)
  })

  it('marks Auth errors as not retryable', () => {
    const error = createApiError('Auth', 'Unauthorized')
    expect(error.retryable).toBe(false)
  })
})

describe('mapHttpStatusToErrorKind', () => {
  it('maps 401 to Auth', () => {
    expect(mapHttpStatusToErrorKind(401)).toBe('Auth')
  })

  it('maps 403 to Auth', () => {
    expect(mapHttpStatusToErrorKind(403)).toBe('Auth')
  })

  it('maps 404 to NotFound', () => {
    expect(mapHttpStatusToErrorKind(404)).toBe('NotFound')
  })

  it('maps 400 to Validation', () => {
    expect(mapHttpStatusToErrorKind(400)).toBe('Validation')
  })

  it('maps 422 to Validation', () => {
    expect(mapHttpStatusToErrorKind(422)).toBe('Validation')
  })

  it('maps 409 to Conflict', () => {
    expect(mapHttpStatusToErrorKind(409)).toBe('Conflict')
  })

  it('maps 429 to RateLimit', () => {
    expect(mapHttpStatusToErrorKind(429)).toBe('RateLimit')
  })

  it('maps 500 to Server', () => {
    expect(mapHttpStatusToErrorKind(500)).toBe('Server')
  })

  it('maps 503 to Server', () => {
    expect(mapHttpStatusToErrorKind(503)).toBe('Server')
  })

  it('maps unknown status to Unknown', () => {
    expect(mapHttpStatusToErrorKind(418)).toBe('Unknown')
  })
})
