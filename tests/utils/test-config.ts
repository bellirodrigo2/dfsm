/**
 * Test Configuration Mock
 * Creates a mock DSM config for contract tests
 */

import type { DsmConfig } from '../../src/domain/config'
import { getTestEnvConfig } from '../config/test-env'

let mockConfig: DsmConfig | null = null

/**
 * Create and inject a mock config for testing
 * This allows code that uses getConfig() to work in test environment
 */
export function createMockConfig(): DsmConfig {
  const testEnv = getTestEnvConfig()

  const config: DsmConfig = {
    version: 1,
    piWebApi: {
      baseUrl: testEnv.piWebApi.baseUrl,
      timeoutMs: 15000,
      retry: {
        enabled: true,
        maxAttempts: 3,
        baseDelayMs: 200,
      },
      cors: {
        withCredentials: true,
      },
    },
    af: {
      root: {
        strategy: testEnv.af.testRootWebId ? 'webId' : 'path',
        primary: {
          elementWebId: testEnv.af.testRootWebId || '',
        },
        fallback: {
          afServerName: testEnv.af.testServer,
          databaseName: testEnv.af.testDatabase,
          elementPath: testEnv.af.testRootPath,
        },
      },
      naming: {
        userName: {
          replaceBackslashWith: '_',
          uppercase: true,
        },
        sanitize: {
          collapseWhitespace: true,
          maxNameLength: 255,
        },
      },
      reservedAttributes: {
        metadataJson: 'DSM__METADATA_JSON',
        permissionsJson: 'DSM__PERMISSIONS_JSON',
      },
    },
    features: {
      sharedPermissions: true,
      tagSearch: {
        minChars: 2,
        debounceMs: 120,
        limit: 50,
        virtualizeAbove: 50,
        enableCache: true,
      },
      executionContext: {
        enabled: false,
        defaultTimeZone: 'UTC',
      },
    },
  }

  mockConfig = config
  return config
}

/**
 * Inject mock config into the app config module
 * This is a bit hacky but necessary for testing
 */
export async function injectMockConfig(): Promise<void> {
  const config = createMockConfig()

  // Import and inject into the config module
  const configModule = await import('../../src/app/config.js')

  // Store the mock config in the module's cache
  // This works because loadConfig() caches the result
  ;(configModule as any).cachedConfig = config
}

export function getMockConfig(): DsmConfig {
  if (!mockConfig) {
    throw new Error('Mock config not created. Call createMockConfig() first.')
  }
  return mockConfig
}

export function clearMockConfig(): void {
  mockConfig = null
}
