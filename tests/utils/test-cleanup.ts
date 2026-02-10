/**
 * Test Cleanup Utilities
 * Manages cleanup of test elements from AF Database
 */

import { piWebApiRequest } from '../../src/piwebapi/client'
import { getTestEnvConfig } from '../config/test-env'
import { isTestName, extractTimestampFromTestName } from './test-naming'
import type { PiWebApiElement, PiWebApiItemsResponse } from '../../src/piwebapi/types'

interface TestCleanupContext {
  rootWebId: string
  createdElements: Set<string> // WebIds criados nesta execução
  createdAttributes: Set<string> // WebIds de atributos criados
}

const cleanupContext: TestCleanupContext = {
  rootWebId: '',
  createdElements: new Set(),
  createdAttributes: new Set(),
}

/**
 * Define o WebId do elemento root de teste
 */
export function setTestRootWebId(webId: string): void {
  cleanupContext.rootWebId = webId
}

/**
 * Retorna o WebId do elemento root de teste
 */
export function getTestRootWebId(): string {
  return cleanupContext.rootWebId
}

/**
 * Registra um elemento criado para cleanup posterior
 */
export function trackCreatedElement(webId: string): void {
  cleanupContext.createdElements.add(webId)
}

/**
 * Registra um atributo criado para cleanup posterior
 */
export function trackCreatedAttribute(webId: string): void {
  cleanupContext.createdAttributes.add(webId)
}

/**
 * Remove todos os elementos criados nesta execução de teste
 */
export async function cleanupTestElements(): Promise<void> {
  const config = getTestEnvConfig()

  if (!config.testIsolation.cleanupAfterTests) {
    console.log('⊘ Cleanup disabled, skipping...')
    return
  }

  if (cleanupContext.createdElements.size === 0) {
    return
  }

  console.log(`🧹 Cleaning up ${cleanupContext.createdElements.size} test elements...`)

  // Delete elements in reverse order (children first)
  const elements = Array.from(cleanupContext.createdElements).reverse()

  for (const webId of elements) {
    try {
      await piWebApiRequest(`elements/${webId}`, { method: 'DELETE' })
      console.log(`  ✓ Deleted element ${webId}`)
    } catch (error) {
      const err = error as Error
      // 404 is OK - element already deleted
      if (err.message && !err.message.includes('404')) {
        console.warn(`  ✗ Failed to delete element ${webId}:`, err.message)
      }
    }
  }

  cleanupContext.createdElements.clear()
  cleanupContext.createdAttributes.clear()
}

/**
 * Remove elementos de teste antigos (baseado em timestamp no nome)
 */
export async function cleanupOldTestElements(): Promise<void> {
  const config = getTestEnvConfig()

  if (!config.testIsolation.cleanupOlderThan || !cleanupContext.rootWebId) {
    return
  }

  const cutoffTime = Date.now() - (config.testIsolation.cleanupOlderThan * 60 * 60 * 1000)

  try {
    console.log('🧹 Checking for old test elements...')

    // Lista todos os elementos sob o root de teste
    const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
      `elements/${cleanupContext.rootWebId}/elements?maxCount=1000`
    )

    const elementsToDelete: Array<{ webId: string; name: string; timestamp: number }> = []

    for (const element of response.Items) {
      // Verifica se é elemento de teste
      if (!isTestName(element.Name)) continue

      // Extrai timestamp do nome
      const timestamp = extractTimestampFromTestName(element.Name)
      if (!timestamp) continue

      if (timestamp < cutoffTime) {
        elementsToDelete.push({
          webId: element.WebId,
          name: element.Name,
          timestamp,
        })
      }
    }

    if (elementsToDelete.length === 0) {
      console.log('  ✓ No old test elements found')
      return
    }

    console.log(`  Found ${elementsToDelete.length} old test elements (older than ${config.testIsolation.cleanupOlderThan}h)`)

    for (const element of elementsToDelete) {
      try {
        await piWebApiRequest(`elements/${element.webId}`, { method: 'DELETE' })
        const age = Math.round((Date.now() - element.timestamp) / (1000 * 60 * 60))
        console.log(`  ✓ Deleted ${element.name} (${age}h old)`)
      } catch (error) {
        const err = error as Error
        console.warn(`  ✗ Failed to delete ${element.name}:`, err.message)
      }
    }
  } catch (error) {
    const err = error as Error
    console.error('Failed to cleanup old test elements:', err.message)
  }
}

/**
 * Lista todos os elementos de teste sob o root
 */
export async function listTestElements(): Promise<PiWebApiElement[]> {
  if (!cleanupContext.rootWebId) {
    return []
  }

  try {
    const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiElement>>(
      `elements/${cleanupContext.rootWebId}/elements?maxCount=1000`
    )

    return response.Items.filter(element => isTestName(element.Name))
  } catch (error) {
    console.error('Failed to list test elements:', error)
    return []
  }
}

/**
 * Limpa todos os elementos de teste (use com cuidado!)
 */
export async function cleanupAllTestElements(): Promise<void> {
  console.log('🧹 Cleaning up ALL test elements...')

  const elements = await listTestElements()

  if (elements.length === 0) {
    console.log('  ✓ No test elements found')
    return
  }

  console.log(`  Found ${elements.length} test elements`)

  for (const element of elements) {
    try {
      await piWebApiRequest(`elements/${element.WebId}`, { method: 'DELETE' })
      console.log(`  ✓ Deleted ${element.Name}`)
    } catch (error) {
      const err = error as Error
      console.warn(`  ✗ Failed to delete ${element.Name}:`, err.message)
    }
  }
}

/**
 * Reseta o contexto de cleanup (para testes)
 */
export function resetCleanupContext(): void {
  cleanupContext.rootWebId = ''
  cleanupContext.createdElements.clear()
  cleanupContext.createdAttributes.clear()
}
