/**
 * Tag Search Service
 * Handles search logic with debouncing and request cancellation
 * Decoupled from UI - can be used with any view layer
 */

import type { TagSearchResult, TagSearchConfig } from '../../domain/tag'
import { defaultTagSearchConfig } from '../../domain/tag'
import { searchTags as apiSearchTags } from '../../piwebapi'

export interface TagSearchService {
  search: (query: string) => Promise<TagSearchResult>
  cancel: () => void
  getConfig: () => TagSearchConfig
}

/**
 * Create a tag search service instance
 * Each instance manages its own debounce timer and abort controller
 */
export function createTagSearchService(
  config: Partial<TagSearchConfig> = {}
): TagSearchService {
  const mergedConfig: TagSearchConfig = {
    ...defaultTagSearchConfig,
    ...config,
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null
  let pendingResolve: ((result: TagSearchResult) => void) | null = null

  // Simple in-memory cache
  const cache = new Map<string, { result: TagSearchResult; timestamp: number }>()
  const CACHE_TTL = 60000 // 1 minute

  function cancel(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
      // Resolve pending promise with empty result
      if (pendingResolve) {
        pendingResolve({ tags: [], hasMore: false })
        pendingResolve = null
      }
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  function getCachedResult(query: string): TagSearchResult | null {
    if (!mergedConfig.enableCache) return null

    const cached = cache.get(query.toLowerCase())
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
    return null
  }

  function setCachedResult(query: string, result: TagSearchResult): void {
    if (!mergedConfig.enableCache) return
    cache.set(query.toLowerCase(), { result, timestamp: Date.now() })
  }

  async function search(query: string): Promise<TagSearchResult> {
    // Cancel any pending search
    cancel()

    // Check minimum characters
    if (!query || query.length < mergedConfig.minChars) {
      return { tags: [], hasMore: false }
    }

    // Check cache first
    const cached = getCachedResult(query)
    if (cached) {
      return cached
    }

    // Return a promise that resolves after debounce
    return new Promise((resolve, reject) => {
      pendingResolve = resolve
      debounceTimer = setTimeout(async () => {
        pendingResolve = null
        abortController = new AbortController()

        try {
          const result = await apiSearchTags({
            query,
            limit: mergedConfig.limit,
            signal: abortController.signal,
          })

          setCachedResult(query, result)
          resolve(result)
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // Search was cancelled, resolve with empty
            resolve({ tags: [], hasMore: false })
          } else {
            reject(error)
          }
        } finally {
          abortController = null
        }
      }, mergedConfig.debounceMs)
    })
  }

  function getConfig(): TagSearchConfig {
    return { ...mergedConfig }
  }

  return {
    search,
    cancel,
    getConfig,
  }
}

// Singleton instance for app-wide use
let defaultService: TagSearchService | null = null

export function getTagSearchService(): TagSearchService {
  if (!defaultService) {
    defaultService = createTagSearchService()
  }
  return defaultService
}

export function resetTagSearchService(): void {
  if (defaultService) {
    defaultService.cancel()
  }
  defaultService = null
}
