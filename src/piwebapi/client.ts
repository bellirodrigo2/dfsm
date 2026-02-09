import ky, { type KyInstance, type Options } from 'ky'
import { getConfig } from '../app/config'
import { createApiError, mapHttpStatusToErrorKind, type ApiError } from '../domain/errors'

export interface PiWebApiClientOptions {
  signal?: AbortSignal
  bypassCache?: boolean
}

let clientInstance: KyInstance | null = null

export function createPiWebApiClient(): KyInstance {
  const config = getConfig()
  const { piWebApi } = config

  return ky.create({
    prefixUrl: piWebApi.baseUrl,
    timeout: piWebApi.timeoutMs,
    credentials: piWebApi.cors.withCredentials ? 'include' : 'same-origin',
    retry: piWebApi.retry.enabled
      ? {
          limit: piWebApi.retry.maxAttempts,
          delay: () => piWebApi.retry.baseDelayMs,
        }
      : 0,
    hooks: {
      beforeRequest: [
        (request) => {
          // Add cache busting header if needed
          if (request.headers.get('X-Bypass-Cache') === 'true') {
            request.headers.delete('X-Bypass-Cache')
            const url = new URL(request.url)
            url.searchParams.set('_t', Date.now().toString())
            return new Request(url.toString(), request)
          }
          return request
        },
      ],
    },
  })
}

export function getPiWebApiClient(): KyInstance {
  if (!clientInstance) {
    clientInstance = createPiWebApiClient()
  }
  return clientInstance
}

export function resetPiWebApiClient(): void {
  clientInstance = null
}

export async function piWebApiRequest<T>(
  path: string,
  options: Options & PiWebApiClientOptions = {}
): Promise<T> {
  const client = getPiWebApiClient()
  const { signal, bypassCache, ...kyOptions } = options

  const requestOptions: Options = {
    ...kyOptions,
    signal,
  }

  if (bypassCache) {
    requestOptions.headers = {
      ...requestOptions.headers,
      'X-Bypass-Cache': 'true',
    }
  }

  try {
    return await client(path, requestOptions).json<T>()
  } catch (error) {
    throw normalizeError(error)
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof Error) {
    // Check if it's a ky HTTPError
    if ('response' in error) {
      const httpError = error as Error & { response: Response }
      const status = httpError.response.status
      const kind = mapHttpStatusToErrorKind(status)
      return createApiError(kind, httpError.message, status)
    }

    // Network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return createApiError('Network', 'Network request failed')
    }

    // Timeout
    if (error.name === 'TimeoutError') {
      return createApiError('Network', 'Request timed out')
    }

    return createApiError('Unknown', error.message)
  }

  return createApiError('Unknown', 'An unknown error occurred')
}
