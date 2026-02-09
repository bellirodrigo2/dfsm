/**
 * Tag Search domain types
 * Fully decoupled from PI Web API implementation
 */

export interface Tag {
  id: string              // WebId
  name: string            // Tag name (e.g., SINUSOID)
  path: string            // Full path (e.g., \\PISRV01\SINUSOID)
  description?: string
  valueType: string       // Data type (Float64, Int32, String, etc.)
  engineeringUnit?: string
}

export interface TagSearchOptions {
  query: string
  limit?: number
  signal?: AbortSignal
}

export interface TagSearchResult {
  tags: Tag[]
  hasMore: boolean
  totalCount?: number
}

/**
 * Tag Search callback types for decoupled integration
 */
export type OnTagSelected = (tag: Tag) => void
export type OnSearchCancelled = () => void

/**
 * Tag Search configuration
 */
export interface TagSearchConfig {
  minChars: number
  debounceMs: number
  limit: number
  enableCache: boolean
}

export const defaultTagSearchConfig: TagSearchConfig = {
  minChars: 2,
  debounceMs: 120,
  limit: 50,
  enableCache: true,
}
