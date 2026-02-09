/**
 * Tag Search Module - Public API
 * 100% decoupled from the main application
 *
 * Usage:
 *   import { useTagSearchStore, TagSearchModal } from '@/modules/tagSearch'
 *
 *   // In setup:
 *   const tagSearch = useTagSearchStore()
 *
 *   // Open search with callbacks:
 *   tagSearch.open({
 *     onSelect: (tag) => console.log('Selected:', tag),
 *     onCancel: () => console.log('Cancelled'),
 *     initialQuery: 'SINUS',
 *     placeholder: 'Search for a tag...',
 *   })
 *
 *   // In template:
 *   <TagSearchModal />
 */

// Store
export { useTagSearchStore } from './store'

// Service (for advanced usage)
export {
  createTagSearchService,
  getTagSearchService,
  resetTagSearchService,
} from './service'
export type { TagSearchService } from './service'

// Component
export { default as TagSearchModal } from './TagSearchModal.vue'

// Types
export type {
  Tag,
  TagSearchConfig,
  TagSearchState,
  TagSearchContext,
  TagSearchStatus,
  OnTagSelected,
  OnSearchCancelled,
} from './types'
