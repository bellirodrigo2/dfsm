import type { DsmConfig } from '../domain/config'

const CONFIG_URL = '/config/dsm.config.json'

let cachedConfig: DsmConfig | null = null

export class ConfigLoadError extends Error {
  readonly errorCause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ConfigLoadError'
    this.errorCause = cause
  }
}

function validateConfig(data: unknown): DsmConfig {
  if (!data || typeof data !== 'object') {
    throw new ConfigLoadError('Config must be an object')
  }

  const config = data as Record<string, unknown>

  if (typeof config.version !== 'number') {
    throw new ConfigLoadError('Config version must be a number')
  }

  if (!config.piWebApi || typeof config.piWebApi !== 'object') {
    throw new ConfigLoadError('Config must have piWebApi section')
  }

  const piWebApi = config.piWebApi as Record<string, unknown>
  if (typeof piWebApi.baseUrl !== 'string' || !piWebApi.baseUrl) {
    throw new ConfigLoadError('piWebApi.baseUrl is required')
  }

  if (!config.af || typeof config.af !== 'object') {
    throw new ConfigLoadError('Config must have af section')
  }

  if (!config.features || typeof config.features !== 'object') {
    throw new ConfigLoadError('Config must have features section')
  }

  return data as DsmConfig
}

export async function loadConfig(): Promise<DsmConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  // Check for window override (for testing or special deployments)
  if (typeof window !== 'undefined' && (window as unknown as { __DSM_CONFIG__?: DsmConfig }).__DSM_CONFIG__) {
    cachedConfig = validateConfig((window as unknown as { __DSM_CONFIG__: DsmConfig }).__DSM_CONFIG__)
    return cachedConfig
  }

  try {
    const response = await fetch(CONFIG_URL)
    if (!response.ok) {
      throw new ConfigLoadError(
        `Failed to load config: HTTP ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    cachedConfig = validateConfig(data)
    return cachedConfig
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error
    }
    throw new ConfigLoadError('Failed to load configuration', error)
  }
}

export function getConfig(): DsmConfig {
  if (!cachedConfig) {
    throw new ConfigLoadError('Config not loaded. Call loadConfig() first.')
  }
  return cachedConfig
}

export function clearConfigCache(): void {
  cachedConfig = null
}
