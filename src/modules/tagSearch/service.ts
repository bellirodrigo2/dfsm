/**
 * Tag Search Service
 * Handles search logic with debouncing and request cancellation
 * Decoupled from UI - can be used with any view layer
 */

import type { TagSearchResult, TagSearchConfig } from '../../domain/tag'
import { defaultTagSearchConfig } from '../../domain/tag'
import { searchTags as apiSearchTags } from '../../piwebapi'
import { useDataServersStore } from '../../stores/dataservers'

export interface TagSearchService {
  search: (query: string, offset?: number) => Promise<TagSearchResult>
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

  function getCachedResult(query: string, offset: number): TagSearchResult | null {
    if (!mergedConfig.enableCache) return null

    const cacheKey = `${query.toLowerCase()}:${offset}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
    return null
  }

  function setCachedResult(query: string, offset: number, result: TagSearchResult): void {
    if (!mergedConfig.enableCache) return
    const cacheKey = `${query.toLowerCase()}:${offset}`
    cache.set(cacheKey, { result, timestamp: Date.now() })
  }

  async function search(query: string, offset = 0): Promise<TagSearchResult> {
    // Cancel any pending search
    cancel()

    // Check minimum characters
    if (!query || query.length < mergedConfig.minChars) {
      return { tags: [], hasMore: false }
    }

    // Check cache first (only cache initial searches, not load-more)
    if (offset === 0) {
      const cached = getCachedResult(query, offset)
      if (cached) {
        return cached
      }
    }

    // Return a promise that resolves after debounce (only debounce initial searches)
    const debounceDelay = offset === 0 ? mergedConfig.debounceMs : 0

    return new Promise((resolve, reject) => {
      pendingResolve = resolve
      debounceTimer = setTimeout(async () => {
        pendingResolve = null
        abortController = new AbortController()

        try {
          // Get selected data server from store
          const dataServersStore = useDataServersStore()
          const dataServerWebId = dataServersStore.selectedDataServerId

          if (!dataServerWebId) {
            throw new Error('No data server selected')
          }

          const result = await apiSearchTags({
            query,
            limit: mergedConfig.limit,
            offset,
            signal: abortController.signal,
            dataServerWebId,
          })

          if (offset === 0) {
            setCachedResult(query, offset, result)
          }
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
      }, debounceDelay)
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
