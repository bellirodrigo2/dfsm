/**
 * Contract Tests - Tags
 * Tests tag search against real PI Web API
 */

import { describe, it, expect } from 'vitest'
import { setupContractTests } from './setup'
import { searchTags, getTagById } from '../../src/piwebapi/tags'

setupContractTests()

describe('PI Web API Contract - Tags', () => {
  it('should search for tags with query', async () => {
    const result = await searchTags({ query: 'SIN', limit: 10 })

    expect(result).toBeDefined()
    expect(result.tags).toBeDefined()
    expect(Array.isArray(result.tags)).toBe(true)
    expect(typeof result.hasMore).toBe('boolean')
  })

  it('should return empty results for short query', async () => {
    const result = await searchTags({ query: 'A', limit: 10 })

    expect(result.tags).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  it('should limit results based on limit parameter', async () => {
    const result = await searchTags({ query: 'TEST', limit: 5 })

    expect(result.tags.length).toBeLessThanOrEqual(5)
  })

  it('should return tags with expected schema', async () => {
    const result = await searchTags({ query: 'SINUS', limit: 1 })

    if (result.tags.length > 0) {
      const tag = result.tags[0]

      expect(tag).toBeDefined()
      expect(tag.id).toBeDefined()
      expect(typeof tag.id).toBe('string')
      expect(tag.name).toBeDefined()
      expect(typeof tag.name).toBe('string')
      expect(tag.path).toBeDefined()
      expect(typeof tag.path).toBe('string')

      // Optional fields
      if (tag.description !== undefined) {
        expect(typeof tag.description).toBe('string')
      }
      if (tag.valueType !== undefined) {
        expect(typeof tag.valueType).toBe('string')
      }
      if (tag.engineeringUnit !== undefined) {
        expect(typeof tag.engineeringUnit).toBe('string')
      }
    }
  })

  it('should retrieve tag by WebId if found', async () => {
    // First, search to get a valid tag ID
    const searchResult = await searchTags({ query: 'SINUSOID', limit: 1 })

    if (searchResult.tags.length > 0) {
      const searchedTag = searchResult.tags[0]

      // Retrieve by ID
      const tag = await getTagById(searchedTag.id)

      expect(tag).toBeDefined()
      expect(tag.id).toBe(searchedTag.id)
      expect(tag.name).toBe(searchedTag.name)
      expect(tag.path).toBe(searchedTag.path)
    }
  })

  it('should handle wildcard searches', async () => {
    const result = await searchTags({ query: 'TEMP', limit: 20 })

    // Should find temperature tags (if they exist)
    expect(result.tags).toBeDefined()

    // Tags should contain the search term
    result.tags.forEach((tag) => {
      const searchTerm = 'TEMP'.toLowerCase()
      const nameMatch = tag.name.toLowerCase().includes(searchTerm)
      const descMatch = tag.description?.toLowerCase().includes(searchTerm) || false

      expect(nameMatch || descMatch).toBe(true)
    })
  })

  it('should handle case-insensitive search', async () => {
    const resultLower = await searchTags({ query: 'sinusoid', limit: 10 })
    const resultUpper = await searchTags({ query: 'SINUSOID', limit: 10 })

    // Should return same results regardless of case
    expect(resultLower.tags.length).toBe(resultUpper.tags.length)
  })
})
