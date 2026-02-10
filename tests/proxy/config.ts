/**
 * Test Proxy Configuration
 * Loads configuration for the local proxy server
 */

import { config } from 'dotenv'

// Load .env.test file if it exists
config({ path: '.env.test' })

export interface TestProxyConfig {
  port: number
  piWebApiUrl: string
  auth: {
    type: 'ntlm' | 'kerberos' | 'basic'
    username?: string
    password?: string
    domain?: string
  }
  logRequests: boolean
}

export function loadProxyConfig(): TestProxyConfig {
  const authType = process.env.TEST_PIWEBAPI_AUTH_TYPE || 'ntlm'

  if (!['ntlm', 'kerberos', 'basic'].includes(authType)) {
    throw new Error(`Invalid auth type: ${authType}. Must be ntlm, kerberos, or basic`)
  }

  return {
    port: parseInt(process.env.TEST_PROXY_PORT || '3001'),
    piWebApiUrl: process.env.TEST_PIWEBAPI_URL || '',
    auth: {
      type: authType as 'ntlm' | 'kerberos' | 'basic',
      username: process.env.TEST_PIWEBAPI_USERNAME,
      password: process.env.TEST_PIWEBAPI_PASSWORD,
      domain: process.env.TEST_PIWEBAPI_DOMAIN,
    },
    logRequests: process.env.TEST_PROXY_LOG !== 'false', // default true
  }
}

export function validateProxyConfig(config: TestProxyConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.piWebApiUrl) {
    errors.push('TEST_PIWEBAPI_URL is required')
  }

  if (!config.auth.username) {
    errors.push('TEST_PIWEBAPI_USERNAME is required')
  }

  if (!config.auth.password) {
    errors.push('TEST_PIWEBAPI_PASSWORD is required')
  }

  if (config.auth.type === 'ntlm' && !config.auth.domain) {
    errors.push('TEST_PIWEBAPI_DOMAIN is required for NTLM auth')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
