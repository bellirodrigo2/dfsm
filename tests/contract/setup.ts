/**
 * Contract Tests Setup
 * Global setup and teardown for contract tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest'
import { startTestProxy, stopTestProxy } from '../proxy/server'
import { loadProxyConfig } from '../proxy/config'
import { getTestEnvConfig, validateTestEnvConfig } from '../config/test-env'
import {
  cleanupTestElements,
  cleanupOldTestElements,
  setTestRootWebId,
  resetCleanupContext,
} from '../utils/test-cleanup'
import { resetTestRunId } from '../utils/test-naming'
import { piWebApiRequest, resetPiWebApiClient } from '../../src/piwebapi/client'
import type { PiWebApiElement } from '../../src/piwebapi/types'
import type { Server } from 'node:http'
import { injectMockConfig } from '../utils/test-config'

let proxyServer: Server | null = null

/**
 * Setup contract tests environment
 */
export function setupContractTests() {
  beforeAll(async () => {
    console.log('\n=== Contract Test Setup ===\n')

    // 1. Validate test configuration
    const validation = validateTestEnvConfig()
    if (!validation.valid) {
      console.error('❌ Invalid test configuration:')
      validation.errors.forEach((error) => console.error(`  - ${error}`))
      throw new Error('Invalid test configuration. Check your .env.test file')
    }

    // 2. Inject mock config (so getConfig() works in tests)
    await injectMockConfig()
    console.log('✓ Mock config injected')

    // 3. Start proxy server
    const proxyConfig = loadProxyConfig()
    try {
      proxyServer = await startTestProxy(proxyConfig)
    } catch (error) {
      const err = error as Error
      if (err.message && err.message.includes('EADDRINUSE')) {
        console.warn('⚠ Proxy port already in use, assuming proxy is running...')
        proxyServer = null
      } else {
        throw error
      }
    }

    // 4. Configure PI Web API client to use proxy
    process.env.PIWEBAPI_BASE_URL = `http://localhost:${proxyConfig.port}/piwebapi`
    resetPiWebApiClient()

    // 5. Resolve test root element
    try {
      const rootWebId = await resolveTestRootElement()
      setTestRootWebId(rootWebId)
      console.log(`✓ Test root element resolved: ${rootWebId}\n`)
    } catch (error) {
      const err = error as Error
      console.error('❌ Failed to resolve test root element:', err.message)
      throw error
    }

    // 6. Cleanup old test elements
    try {
      await cleanupOldTestElements()
    } catch (error) {
      console.warn('⚠ Failed to cleanup old test elements:', error)
    }

    console.log('=== Setup Complete ===\n')
  }, 30000) // 30 second timeout for setup

  afterEach(async () => {
    // Cleanup after each test
    await cleanupTestElements()
  })

  afterAll(async () => {
    console.log('\n=== Contract Test Teardown ===\n')

    // Final cleanup
    try {
      await cleanupTestElements()
      console.log('✓ Test elements cleaned up')
    } catch (error) {
      console.warn('⚠ Failed to cleanup test elements:', error)
    }

    // Stop proxy
    if (proxyServer) {
      try {
        await stopTestProxy(proxyServer)
      } catch (error) {
        console.warn('⚠ Failed to stop proxy:', error)
      }
      proxyServer = null
    }

    // Reset contexts
    resetCleanupContext()
    resetTestRunId()
    resetPiWebApiClient()

    console.log('\n=== Teardown Complete ===\n')
  })
}

/**
 * Resolve test root element from configuration
 */
async function resolveTestRootElement(): Promise<string> {
  const config = getTestEnvConfig()

  console.log('Resolving test root element...')

  // Strategy 1: Try using WebId (fastest and most reliable)
  if (config.af.testRootWebId) {
    try {
      console.log(`  Trying WebId: ${config.af.testRootWebId}`)
      const element = await piWebApiRequest<PiWebApiElement>(
        `elements/${config.af.testRootWebId}`
      )
      console.log(`  ✓ Found element: ${element.Name}`)
      return element.WebId
    } catch (error) {
      const err = error as Error
      console.warn(`  ✗ WebId not found: ${err.message}`)
      console.log('  Falling back to path resolution...')
    }
  }

  // Strategy 2: Try resolving by path
  if (config.af.testRootPath) {
    try {
      console.log(`  Trying path: ${config.af.testServer}\\${config.af.testDatabase}${config.af.testRootPath}`)

      // Build element path
      const elementPath = `\\\\${config.af.testServer}\\${config.af.testDatabase}${config.af.testRootPath}`

      // Resolve element by path
      const element = await piWebApiRequest<PiWebApiElement>(
        `elements?path=${encodeURIComponent(elementPath)}`
      )

      console.log(`  ✓ Found element: ${element.Name}`)
      return element.WebId
    } catch (error) {
      const err = error as Error
      throw new Error(
        `Failed to resolve test root element by path.\n` +
          `  Path: ${config.af.testRootPath}\n` +
          `  Error: ${err.message}\n\n` +
          `Please check:\n` +
          `  1. AF Server name is correct (${config.af.testServer})\n` +
          `  2. AF Database exists (${config.af.testDatabase})\n` +
          `  3. Root element exists (${config.af.testRootPath})\n` +
          `  4. You have permissions to access the element\n`
      )
    }
  }

  throw new Error(
    'Test root element not configured.\n' +
      'Set either TEST_AF_ROOT_WEBID or TEST_AF_ROOT_PATH in your .env.test file'
  )
}
