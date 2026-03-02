import type { PiWebApiDataServer, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'

export interface DataServer {
  id: string
  name: string
  path: string
}

/**
 * List all available PI Data Servers
 */
export async function listDataServers(
  options?: PiWebApiClientOptions
): Promise<DataServer[]> {
  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiDataServer>>(
    'dataservers',
    options
  )

  return response.Items.map(normalizeDataServer)
}

/**
 * Get a single data server by WebId
 */
export async function getDataServer(
  id: string,
  options?: PiWebApiClientOptions
): Promise<DataServer> {
  const dataServer = await piWebApiRequest<PiWebApiDataServer>(
    `dataservers/${id}`,
    options
  )
  return normalizeDataServer(dataServer)
}

function normalizeDataServer(dataServer: PiWebApiDataServer): DataServer {
  return {
    id: dataServer.WebId,
    name: dataServer.Name,
    path: dataServer.Path,
  }
}
