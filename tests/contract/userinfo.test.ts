/**
 * Contract Tests - UserInfo
 * Tests getUserInfo against real PI Web API
 */

import { describe, it, expect } from 'vitest'
import { setupContractTests } from './setup'
import { getUserInfo } from '../../src/piwebapi/userinfo'

setupContractTests()

describe('PI Web API Contract - UserInfo', () => {
  it('should return authenticated user info', async () => {
    const userInfo = await getUserInfo()

    // Validate contract
    expect(userInfo).toBeDefined()
    expect(userInfo.name).toBeDefined()
    expect(typeof userInfo.name).toBe('string')
    expect(userInfo.sid).toBeDefined()
    expect(typeof userInfo.sid).toBe('string')
    expect(userInfo.isAuthenticated).toBe(true)
    expect(userInfo.identityType).toBeDefined()
  })

  it('should return consistent data on multiple calls', async () => {
    const userInfo1 = await getUserInfo()
    const userInfo2 = await getUserInfo()

    expect(userInfo1.name).toBe(userInfo2.name)
    expect(userInfo1.sid).toBe(userInfo2.sid)
    expect(userInfo1.identityType).toBe(userInfo2.identityType)
  })

  it('should normalize Windows identity format', async () => {
    const userInfo = await getUserInfo()

    // Windows identity should be in format DOMAIN\username
    if (userInfo.identityType === 'WindowsIdentity') {
      expect(userInfo.name).toMatch(/^[A-Z0-9_-]+\\[A-Za-z0-9._-]+$/i)
    }
  })

  it('should have valid SID format', async () => {
    const userInfo = await getUserInfo()

    // SID should start with S-1-
    expect(userInfo.sid).toMatch(/^S-1-/)
  })
})
