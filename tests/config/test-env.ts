/**
 * Test Environment Configuration
 * Loads configuration for contract tests against real PI Web API
 */

export interface TestEnvironmentConfig {
  piWebApi: {
    baseUrl: string
    auth: {
      type: 'ntlm' | 'kerberos' | 'basic'
      username: string
      password: string
      domain?: string
    }
  }
  af: {
    testServer: string      // Nome do AF Server de teste
    testDatabase: string    // Nome do AF Database de teste
    testRootWebId?: string  // WebId do elemento root para testes (se conhecido)
    testRootPath?: string   // Path do elemento root (fallback)
  }
  testIsolation: {
    useTimestampPrefix: boolean    // Adiciona timestamp aos nomes
    useRandomSuffix: boolean       // Adiciona random aos nomes
    cleanupAfterTests: boolean     // Remove elementos criados
    cleanupOlderThan?: number      // Remove elementos mais antigos que X horas
  }
}

function loadTestEnvConfig(): TestEnvironmentConfig {
  // Load from environment variables
  return {
    piWebApi: {
      baseUrl: process.env.TEST_PIWEBAPI_URL || 'http://localhost:3001/piwebapi',
      auth: {
        type: (process.env.TEST_PIWEBAPI_AUTH_TYPE as 'ntlm' | 'kerberos' | 'basic') || 'ntlm',
        username: process.env.TEST_PIWEBAPI_USERNAME || '',
        password: process.env.TEST_PIWEBAPI_PASSWORD || '',
        domain: process.env.TEST_PIWEBAPI_DOMAIN,
      },
    },
    af: {
      testServer: process.env.TEST_AF_SERVER || 'AFSERVER01',
      testDatabase: process.env.TEST_AF_DATABASE || 'DSM_TEST_DB',
      testRootWebId: process.env.TEST_AF_ROOT_WEBID,
      testRootPath: process.env.TEST_AF_ROOT_PATH || '\\DSM_TEST_ROOT',
    },
    testIsolation: {
      useTimestampPrefix: process.env.TEST_USE_TIMESTAMP !== 'false', // default true
      useRandomSuffix: process.env.TEST_USE_RANDOM !== 'false', // default true
      cleanupAfterTests: process.env.TEST_CLEANUP !== 'false', // default true
      cleanupOlderThan: parseInt(process.env.TEST_CLEANUP_HOURS || '24'),
    },
  }
}

let cachedTestConfig: TestEnvironmentConfig | null = null

export function getTestEnvConfig(): TestEnvironmentConfig {
  if (!cachedTestConfig) {
    cachedTestConfig = loadTestEnvConfig()
  }
  return cachedTestConfig
}

export function resetTestEnvConfig(): void {
  cachedTestConfig = null
}

/**
 * Validate test environment configuration
 */
export function validateTestEnvConfig(): { valid: boolean; errors: string[] } {
  const config = getTestEnvConfig()
  const errors: string[] = []

  if (!config.piWebApi.baseUrl) {
    errors.push('TEST_PIWEBAPI_URL is required')
  }

  if (!config.piWebApi.auth.username) {
    errors.push('TEST_PIWEBAPI_USERNAME is required')
  }

  if (!config.piWebApi.auth.password) {
    errors.push('TEST_PIWEBAPI_PASSWORD is required')
  }

  if (!config.af.testRootWebId && !config.af.testRootPath) {
    errors.push('Either TEST_AF_ROOT_WEBID or TEST_AF_ROOT_PATH must be set')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
