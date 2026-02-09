/**
 * Tag Search Module Types
 * Fully self-contained, no external dependencies
 */

import type { Tag, TagSearchConfig, OnTagSelected, OnSearchCancelled } from '../../domain/tag'

export type { Tag, TagSearchConfig, OnTagSelected, OnSearchCancelled }

export type TagSearchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TagSearchState {
  isOpen: boolean
  query: string
  results: Tag[]
  status: TagSearchStatus
  error: string | null
  hasMore: boolean
  selectedIndex: number
}

export interface TagSearchContext {
  /** Callback when a tag is selected */
  onSelect?: OnTagSelected
  /** Callback when search is cancelled (Escape or click outside) */
  onCancel?: OnSearchCancelled
  /** Optional initial query */
  initialQuery?: string
  /** Custom placeholder text */
  placeholder?: string
}
