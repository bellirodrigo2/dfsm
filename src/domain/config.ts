/**
 * Runtime configuration schema for DSM
 * Loaded from /config/dsm.config.json at startup
 */

export interface RetryConfig {
  enabled: boolean
  maxAttempts: number
  baseDelayMs: number
}

export interface CorsConfig {
  withCredentials: boolean
}

export interface PiWebApiConfig {
  baseUrl: string
  timeoutMs: number
  retry: RetryConfig
  cors: CorsConfig
}

export interface AfRootPrimary {
  elementWebId: string
}

export interface AfRootFallback {
  afServerName: string
  databaseName: string
  elementPath: string
}

export interface AfRootConfig {
  strategy: 'webId' | 'path'
  primary: AfRootPrimary
  fallback: AfRootFallback
}

export interface NamingConfig {
  userName: {
    replaceBackslashWith: string
    uppercase: boolean
  }
  sanitize: {
    collapseWhitespace: boolean
    maxNameLength: number
  }
}

export interface ReservedAttributesConfig {
  metadataJson: string
  permissionsJson: string
}

export interface AfConfig {
  root: AfRootConfig
  naming: NamingConfig
  reservedAttributes: ReservedAttributesConfig
}

export interface TagSearchConfig {
  minChars: number
  debounceMs: number
  limit: number
  virtualizeAbove: number
  enableCache: boolean
}

export interface ExecutionContextConfig {
  enabled: boolean
  defaultTimeZone: string
}

export interface FeaturesConfig {
  sharedPermissions: boolean
  tagSearch: TagSearchConfig
  executionContext: ExecutionContextConfig
}

export interface DsmConfig {
  version: number
  piWebApi: PiWebApiConfig
  af: AfConfig
  features: FeaturesConfig
}
