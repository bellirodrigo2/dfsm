/**
 * Test Naming Utilities
 * Generates unique names for test elements to prevent collisions
 */

import { getTestEnvConfig } from '../config/test-env'

let testRunId: string | null = null

/**
 * Gera um ID único para esta execução de testes
 * Usado para agrupar elementos criados na mesma execução
 */
export function getTestRunId(): string {
  if (!testRunId) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    testRunId = `${timestamp}_${random}`
  }
  return testRunId
}

/**
 * Reset test run ID (for testing purposes)
 */
export function resetTestRunId(): void {
  testRunId = null
}

/**
 * Cria um nome único para elemento/atributo de teste
 * Previne colisões entre execuções paralelas ou sequenciais
 *
 * @param baseName - Nome base do elemento
 * @returns Nome único com prefixos/sufixos configurados
 *
 * @example
 * createTestName('MyDataFrame')
 * // Returns: "TEST_T1KJH8A_MYDATAFRAME_X7B2"
 */
export function createTestName(baseName: string): string {
  const config = getTestEnvConfig()
  let name = baseName.toUpperCase().replace(/\s+/g, '_')

  // Remove caracteres inválidos do AF
  name = name.replace(/[*?;{}\[\]|\\`'"]/g, '')

  if (config.testIsolation.useTimestampPrefix) {
    const timestamp = Date.now().toString(36).toUpperCase()
    name = `T${timestamp}_${name}`
  }

  if (config.testIsolation.useRandomSuffix) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    name = `${name}_${random}`
  }

  // Sempre adiciona prefixo TEST para identificação fácil
  if (!name.startsWith('TEST_')) {
    name = `TEST_${name}`
  }

  // Limita tamanho do nome (AF limit)
  if (name.length > 255) {
    name = name.substring(0, 255)
  }

  return name
}

/**
 * Cria um nome de User Element para testes
 */
export function createTestUserName(username: string): string {
  return createTestName(`USER_${username}`)
}

/**
 * Cria um nome de DataFrame para testes
 */
export function createTestDataFrameName(dfName: string): string {
  return createTestName(`DF_${dfName}`)
}

/**
 * Cria um nome de Column para testes
 */
export function createTestColumnName(colName: string): string {
  return createTestName(`COL_${colName}`)
}

/**
 * Verifica se um nome é de teste (para cleanup)
 *
 * @param name - Nome do elemento/atributo
 * @returns true se é um nome de teste
 */
export function isTestName(name: string): boolean {
  return name.startsWith('TEST_') || /^T[0-9A-Z]+_/.test(name)
}

/**
 * Extrai timestamp de um nome de teste (se disponível)
 *
 * @param name - Nome do elemento de teste
 * @returns Timestamp em milissegundos, ou null se não encontrado
 */
export function extractTimestampFromTestName(name: string): number | null {
  const match = name.match(/^TEST_T([0-9A-Z]+)_/)
  if (!match) return null

  try {
    return parseInt(match[1], 36)
  } catch {
    return null
  }
}
