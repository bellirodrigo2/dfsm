/**
 * Contract Tests - AF Root Resolution
 * Tests AF root element resolution against real PI Web API
 */

import { describe, it, expect } from 'vitest'
import { setupContractTests } from './setup'
import { getAfRootWebId, clearAfRootCache } from '../../src/piwebapi/afroot'

setupContractTests()

describe('PI Web API Contract - AF Root', () => {
  it('should resolve AF root element WebId', async () => {
    const rootWebId = await getAfRootWebId()

    expect(rootWebId).toBeDefined()
    expect(typeof rootWebId).toBe('string')
    expect(rootWebId.length).toBeGreaterThan(0)
  })

  it('should cache AF root WebId', async () => {
    // Clear cache first
    clearAfRootCache()

    // First call
    const start1 = Date.now()
    const rootWebId1 = await getAfRootWebId()
    const duration1 = Date.now() - start1

    // Second call (should be cached)
    const start2 = Date.now()
    const rootWebId2 = await getAfRootWebId()
    const duration2 = Date.now() - start2

    expect(rootWebId1).toBe(rootWebId2)
    // Cached call should be much faster (< 1ms)
    expect(duration2).toBeLessThan(duration1)
    expect(duration2).toBeLessThan(10)
  })

  it('should return same WebId on multiple calls', async () => {
    const rootWebId1 = await getAfRootWebId()
    const rootWebId2 = await getAfRootWebId()
    const rootWebId3 = await getAfRootWebId()

    expect(rootWebId1).toBe(rootWebId2)
    expect(rootWebId2).toBe(rootWebId3)
  })

  it('should clear cache correctly', async () => {
    const rootWebId1 = await getAfRootWebId()

    clearAfRootCache()

    const rootWebId2 = await getAfRootWebId()

    // Should be same WebId but freshly fetched
    expect(rootWebId1).toBe(rootWebId2)
  })
})
