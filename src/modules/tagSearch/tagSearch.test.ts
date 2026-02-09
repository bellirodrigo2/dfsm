/**
 * Tag Search Module Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagSearchStore } from './store'
import {
  createTagSearchService,
  resetTagSearchService,
} from './service'
import type { Tag } from './types'

// Mock the piwebapi module
vi.mock('../../piwebapi', () => ({
  searchTags: vi.fn(),
}))

import { searchTags as mockSearchTags } from '../../piwebapi'

const sampleTags: Tag[] = [
  {
    id: 'TAG1',
    name: 'SINUSOID',
    path: '\\\\PISRV01\\SINUSOID',
    description: 'Sine wave',
    valueType: 'Float64',
  },
  {
    id: 'TAG2',
    name: 'TEMP.1',
    path: '\\\\PISRV01\\TEMP.1',
    description: 'Temperature',
    valueType: 'Float32',
    engineeringUnit: 'deg C',
  },
]

describe('Tag Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetTagSearchService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a service with default config', () => {
    const service = createTagSearchService()
    const config = service.getConfig()

    expect(config.minChars).toBe(2)
    expect(config.debounceMs).toBe(120)
    expect(config.limit).toBe(50)
    expect(config.enableCache).toBe(true)
  })

  it('creates a service with custom config', () => {
    const service = createTagSearchService({
      minChars: 3,
      debounceMs: 200,
      limit: 25,
      enableCache: false,
    })
    const config = service.getConfig()

    expect(config.minChars).toBe(3)
    expect(config.debounceMs).toBe(200)
    expect(config.limit).toBe(25)
    expect(config.enableCache).toBe(false)
  })

  it('returns empty results for short queries', async () => {
    const service = createTagSearchService({ minChars: 3 })
    const result = await service.search('ab')

    expect(result.tags).toEqual([])
    expect(result.hasMore).toBe(false)
    expect(mockSearchTags).not.toHaveBeenCalled()
  })

  it('returns empty results for empty query', async () => {
    const service = createTagSearchService()
    const result = await service.search('')

    expect(result.tags).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('debounces search requests', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const service = createTagSearchService({ debounceMs: 50 })

    // Start multiple searches rapidly - each cancels the previous
    service.search('test1')
    service.search('test2')
    const promise3 = service.search('test3')

    // Advance timers to trigger debounce
    await vi.advanceTimersByTimeAsync(100)

    await promise3

    // Should have only made one API call (last one after debounce)
    expect(mockSearchTags).toHaveBeenCalledTimes(1)
    expect(mockSearchTags).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'test3' })
    )
  })

  it('cancels pending search before debounce fires', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const service = createTagSearchService({ debounceMs: 100 })

    const promise = service.search('test')

    // Cancel before debounce timer fires
    service.cancel()

    // Advance time past debounce
    await vi.advanceTimersByTimeAsync(200)

    const result = await promise

    // Cancelled search returns empty - API was never called
    expect(result.tags).toEqual([])
    expect(mockSearchTags).not.toHaveBeenCalled()
  })

  it('caches results when enabled', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const service = createTagSearchService({ debounceMs: 10, enableCache: true })

    // First search
    const promise1 = service.search('test')
    await vi.advanceTimersByTimeAsync(20)
    const result1 = await promise1
    expect(result1.tags).toEqual(sampleTags)

    // Second search with same query should use cache (no debounce needed)
    const result2 = await service.search('test')
    expect(result2.tags).toEqual(sampleTags)

    // API should only be called once
    expect(mockSearchTags).toHaveBeenCalledTimes(1)
  })
})

describe('Tag Search Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    resetTagSearchService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with correct default state', () => {
    const store = useTagSearchStore()

    expect(store.isOpen).toBe(false)
    expect(store.query).toBe('')
    expect(store.results).toEqual([])
    expect(store.status).toBe('idle')
    expect(store.error).toBeNull()
    expect(store.hasMore).toBe(false)
    expect(store.selectedIndex).toBe(0)
  })

  it('opens modal and sets context', () => {
    const store = useTagSearchStore()
    const onSelect = vi.fn()
    const onCancel = vi.fn()

    store.open({
      onSelect,
      onCancel,
      initialQuery: '',
      placeholder: 'Search tags...',
    })

    expect(store.isOpen).toBe(true)
    expect(store.context.onSelect).toBe(onSelect)
    expect(store.context.onCancel).toBe(onCancel)
    expect(store.context.placeholder).toBe('Search tags...')
  })

  it('closes modal and resets state', () => {
    const store = useTagSearchStore()

    store.open()
    store.close()

    expect(store.isOpen).toBe(false)
    expect(store.query).toBe('')
    expect(store.results).toEqual([])
    expect(store.status).toBe('idle')
  })

  it('calls onCancel callback when cancelled', () => {
    const store = useTagSearchStore()
    const onCancel = vi.fn()

    store.open({ onCancel })
    store.cancel()

    expect(onCancel).toHaveBeenCalled()
    expect(store.isOpen).toBe(false)
  })

  it('performs search and updates state', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const store = useTagSearchStore()
    store.open()

    const searchPromise = store.search('test')

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    expect(store.query).toBe('test')
    expect(store.results).toEqual(sampleTags)
    expect(store.status).toBe('success')
    expect(store.hasMore).toBe(false)
  })

  it('handles search error', async () => {
    vi.mocked(mockSearchTags).mockRejectedValue(new Error('Network error'))

    const store = useTagSearchStore()
    store.open()

    const searchPromise = store.search('test')
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    expect(store.status).toBe('error')
    expect(store.error).toBe('Network error')
    expect(store.results).toEqual([])
  })

  it('selects tag and calls callback', () => {
    const store = useTagSearchStore()
    const onSelect = vi.fn()

    store.open({ onSelect })
    store.selectTag(sampleTags[0]!)

    expect(onSelect).toHaveBeenCalledWith(sampleTags[0])
    expect(store.isOpen).toBe(false)
  })

  it('navigates selection with keyboard', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const store = useTagSearchStore()
    store.open()
    const searchPromise = store.search('test')
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    expect(store.selectedIndex).toBe(0)

    store.selectDown()
    expect(store.selectedIndex).toBe(1)

    store.selectDown()
    expect(store.selectedIndex).toBe(0) // Wraps around

    store.selectUp()
    expect(store.selectedIndex).toBe(1) // Wraps around
  })

  it('selects current tag with Enter', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const store = useTagSearchStore()
    const onSelect = vi.fn()

    store.open({ onSelect })
    const searchPromise = store.search('test')
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    store.selectCurrent()

    expect(onSelect).toHaveBeenCalledWith(sampleTags[0])
  })

  it('computes isEmpty correctly', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: [],
      hasMore: false,
    })

    const store = useTagSearchStore()
    store.open()

    const searchPromise = store.search('nonexistent')
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    expect(store.isEmpty).toBe(true)
    expect(store.hasResults).toBe(false)
  })

  it('computes isLoading correctly', () => {
    const store = useTagSearchStore()
    store.open()

    expect(store.isLoading).toBe(false)
  })

  it('sets selected index within bounds', async () => {
    vi.mocked(mockSearchTags).mockResolvedValue({
      tags: sampleTags,
      hasMore: false,
    })

    const store = useTagSearchStore()
    store.open()
    const searchPromise = store.search('test')
    await vi.advanceTimersByTimeAsync(200)
    await searchPromise

    store.setSelectedIndex(1)
    expect(store.selectedIndex).toBe(1)

    // Out of bounds - should not change
    store.setSelectedIndex(99)
    expect(store.selectedIndex).toBe(1)

    store.setSelectedIndex(-1)
    expect(store.selectedIndex).toBe(1)
  })

  it('gets state snapshot', () => {
    const store = useTagSearchStore()
    store.open()

    const state = store.getState()

    expect(state.isOpen).toBe(true)
    expect(state.query).toBe('')
    expect(state.results).toEqual([])
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
    expect(state.hasMore).toBe(false)
    expect(state.selectedIndex).toBe(0)
  })
})
