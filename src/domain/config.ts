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

export interface CsvExportConfig {
  separator: string        // Field separator (e.g., "," for US, ";" for Brazil/Europe)
  delimiter: string         // Text delimiter (e.g., '"')
  decimalSeparator: string  // Decimal separator (e.g., "." for US, "," for Brazil)
  dateFormat: string        // Date format (e.g., "YYYY-MM-DD HH:mm:ss" or "DD/MM/YYYY HH:mm:ss")
  includeHeaders: boolean   // Include column headers
  encoding: string          // File encoding (e.g., "utf-8", "windows-1252", "utf-8-sig")
  nullRepresentation: string // How to represent null values (e.g., "", "null", "N/A")
}

export interface XlsxExportConfig {
  decimalSeparator: string  // Decimal separator (e.g., "." for US, "," for Brazil)
  dateFormat: string        // Date format for Excel cells (Excel format codes)
  sheetName: string         // Default sheet name
  nullRepresentation: string // How to represent null values
}

export interface ExportConfig {
  defaultFormat: 'xlsx' | 'csv' // Default export format
  csv: CsvExportConfig
  xlsx: XlsxExportConfig
  // Future formats can be added here:
  // parquet?: ParquetExportConfig
  // json?: JsonExportConfig
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
  export: ExportConfig
}
