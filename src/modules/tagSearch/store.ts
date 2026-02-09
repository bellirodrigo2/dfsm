/**
 * Tag Search Store
 * Manages tag search state - fully decoupled from UI
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tag, TagSearchState, TagSearchContext, TagSearchStatus } from './types'
import { getTagSearchService } from './service'

export const useTagSearchStore = defineStore('tagSearch', () => {
  // State
  const isOpen = ref(false)
  const query = ref('')
  const results = ref<Tag[]>([])
  const status = ref<TagSearchStatus>('idle')
  const error = ref<string | null>(null)
  const hasMore = ref(false)
  const selectedIndex = ref(0)

  // Context - callbacks and options for current search session
  const context = ref<TagSearchContext>({})

  // Computed
  const isLoading = computed(() => status.value === 'loading')
  const isEmpty = computed(() => status.value === 'success' && results.value.length === 0)
  const hasResults = computed(() => results.value.length > 0)
  const selectedTag = computed(() =>
    selectedIndex.value >= 0 && selectedIndex.value < results.value.length
      ? results.value[selectedIndex.value]
      : null
  )

  // Actions
  function open(ctx: TagSearchContext = {}): void {
    context.value = ctx
    query.value = ctx.initialQuery ?? ''
    results.value = []
    status.value = 'idle'
    error.value = null
    hasMore.value = false
    selectedIndex.value = 0
    isOpen.value = true

    // If there's an initial query, trigger search
    if (ctx.initialQuery) {
      search(ctx.initialQuery)
    }
  }

  function close(): void {
    const service = getTagSearchService()
    service.cancel()

    isOpen.value = false
    query.value = ''
    results.value = []
    status.value = 'idle'
    error.value = null
    context.value = {}
  }

  function cancel(): void {
    context.value.onCancel?.()
    close()
  }

  async function search(searchQuery: string): Promise<void> {
    query.value = searchQuery
    selectedIndex.value = 0

    const service = getTagSearchService()
    const config = service.getConfig()

    if (!searchQuery || searchQuery.length < config.minChars) {
      results.value = []
      status.value = 'idle'
      error.value = null
      hasMore.value = false
      return
    }

    status.value = 'loading'
    error.value = null

    try {
      const result = await service.search(searchQuery)
      results.value = result.tags
      hasMore.value = result.hasMore
      status.value = 'success'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      status.value = 'error'
      results.value = []
    }
  }

  function selectTag(tag: Tag): void {
    context.value.onSelect?.(tag)
    close()
  }

  function selectCurrent(): void {
    const tag = selectedTag.value
    if (tag) {
      selectTag(tag)
    }
  }

  function moveSelection(delta: number): void {
    if (results.value.length === 0) return

    let newIndex = selectedIndex.value + delta
    if (newIndex < 0) {
      newIndex = results.value.length - 1
    } else if (newIndex >= results.value.length) {
      newIndex = 0
    }
    selectedIndex.value = newIndex
  }

  function selectUp(): void {
    moveSelection(-1)
  }

  function selectDown(): void {
    moveSelection(1)
  }

  function setSelectedIndex(index: number): void {
    if (index >= 0 && index < results.value.length) {
      selectedIndex.value = index
    }
  }

  // Expose state for external access
  function getState(): TagSearchState {
    return {
      isOpen: isOpen.value,
      query: query.value,
      results: results.value,
      status: status.value,
      error: error.value,
      hasMore: hasMore.value,
      selectedIndex: selectedIndex.value,
    }
  }

  return {
    // State (reactive)
    isOpen,
    query,
    results,
    status,
    error,
    hasMore,
    selectedIndex,
    context,

    // Computed
    isLoading,
    isEmpty,
    hasResults,
    selectedTag,

    // Actions
    open,
    close,
    cancel,
    search,
    selectTag,
    selectCurrent,
    selectUp,
    selectDown,
    setSelectedIndex,
    getState,
  }
})
