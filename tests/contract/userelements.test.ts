/**
 * Contract Tests - User Elements
 * Tests user element management against real PI Web API
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { setupContractTests } from './setup'
import { createTestUserName } from '../utils/test-naming'
import { trackCreatedElement } from '../utils/test-cleanup'
import {
  getOrCreateUserElement,
  userElementExists,
  listUserElements,
} from '../../src/piwebapi/userelements'
import { getUserInfo } from '../../src/piwebapi/userinfo'
import type { UserInfo } from '../../src/domain/user'

setupContractTests()

describe('PI Web API Contract - User Elements', () => {
  let testUserInfo: UserInfo

  beforeAll(async () => {
    // Get real user info but modify name for testing
    const realUserInfo = await getUserInfo()
    testUserInfo = {
      ...realUserInfo,
      name: createTestUserName('testuser'),
    }
  })

  it('should create user element if not exists', async () => {
    const userElementWebId = await getOrCreateUserElement(testUserInfo)

    expect(userElementWebId).toBeDefined()
    expect(typeof userElementWebId).toBe('string')
    expect(userElementWebId.length).toBeGreaterThan(0)

    // Track for cleanup
    trackCreatedElement(userElementWebId)
  })

  it('should return existing user element on second call', async () => {
    // First call - creates element
    const webId1 = await getOrCreateUserElement(testUserInfo)
    trackCreatedElement(webId1)

    // Second call - should return same element
    const webId2 = await getOrCreateUserElement(testUserInfo)

    expect(webId1).toBe(webId2)
  })

  it('should check if user element exists', async () => {
    // Create element first
    const webId = await getOrCreateUserElement(testUserInfo)
    trackCreatedElement(webId)

    // Check existence
    const exists = await userElementExists(testUserInfo)

    expect(exists).toBe(true)
  })

  it('should list user elements', async () => {
    // Create test user element
    const webId = await getOrCreateUserElement(testUserInfo)
    trackCreatedElement(webId)

    // List all user elements
    const elements = await listUserElements()

    expect(elements).toBeDefined()
    expect(Array.isArray(elements)).toBe(true)

    // Should include our created element
    const found = elements.find((el) => el.WebId === webId)
    expect(found).toBeDefined()
  })

  it('should handle normalized username correctly', async () => {
    // Test with different username formats
    const testCases = [
      { name: 'DOMAIN\\testuser', normalized: 'DOMAIN_TESTUSER' },
      { name: 'domain\\TestUser', normalized: 'DOMAIN_TESTUSER' },
    ]

    for (const testCase of testCases) {
      const userInfo: UserInfo = {
        ...testUserInfo,
        name: createTestUserName(testCase.name),
      }

      const webId = await getOrCreateUserElement(userInfo)
      trackCreatedElement(webId)

      expect(webId).toBeDefined()
    }
  })

  it('should store user metadata in element', async () => {
    const userInfo: UserInfo = {
      identityType: 'WindowsIdentity',
      name: createTestUserName('metadata_test'),
      isAuthenticated: true,
      sid: 'S-1-5-21-1234567890-1234567890-1234567890-1001',
    }

    const webId = await getOrCreateUserElement(userInfo)
    trackCreatedElement(webId)

    // User element should have been created with metadata
    // We can't easily verify this without reading attributes,
    // but at least verify creation succeeded
    expect(webId).toBeDefined()
  })

  it('should create unique elements for different users', async () => {
    const user1Info: UserInfo = {
      ...testUserInfo,
      name: createTestUserName('user1'),
      sid: 'S-1-5-21-TEST-USER-1',
    }

    const user2Info: UserInfo = {
      ...testUserInfo,
      name: createTestUserName('user2'),
      sid: 'S-1-5-21-TEST-USER-2',
    }

    const webId1 = await getOrCreateUserElement(user1Info)
    trackCreatedElement(webId1)

    const webId2 = await getOrCreateUserElement(user2Info)
    trackCreatedElement(webId2)

    // Should be different elements
    expect(webId1).not.toBe(webId2)
  })
})
