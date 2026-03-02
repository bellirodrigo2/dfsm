import type { Tag, TagSearchResult, TagSearchOptions } from '../domain/tag'
import type { PiWebApiPoint, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'


const MIN_CHAR = 2
const RESULTS_LIMIT = 50

const QUERY_PREFIX = ''
const QUERY_SUFIX = '*'

/**
 * Search for PI Points (tags)
 */
export async function searchTags(
  options: TagSearchOptions & PiWebApiClientOptions & { dataServerWebId?: string; offset?: number }
): Promise<TagSearchResult> {
  const { query, limit = RESULTS_LIMIT, offset = 0, signal, dataServerWebId, ...clientOptions } = options

  if (!query || query.length < MIN_CHAR) {
    return { tags: [], hasMore: false }
  }

  if (!dataServerWebId) {
    throw new Error('dataServerWebId is required for tag search')
  }

  // PI Web API search endpoint for points
  // Uses query parameter with wildcard for partial matching
  const searchQuery = `${QUERY_PREFIX}${query}${QUERY_SUFIX}`
  const maxCount = limit + 1 // Request one extra to detect hasMore

  // Build URL with pagination parameters
  let url = `points/search?query=${encodeURIComponent(searchQuery)}&dataServerWebId=${encodeURIComponent(dataServerWebId)}&maxCount=${maxCount}`
  if (offset > 0) {
    url += `&startIndex=${offset}`
  }

  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiPoint>>(
    url,
    { ...clientOptions, signal }
  )

  const tags = response.Items.slice(0, limit).map(normalizePoint)
  const hasMore = response.Items.length > limit

  return {
    tags,
    hasMore,
    totalCount: response.Items.length,
  }
}

/**
 * Get a single tag by WebId
 */
export async function getTagById(
  id: string,
  options?: PiWebApiClientOptions
): Promise<Tag> {
  const point = await piWebApiRequest<PiWebApiPoint>(
    `points/${id}`,
    options
  )
  return normalizePoint(point)
}

/**
 * Get a tag by its path
 */
export async function getTagByPath(
  path: string,
  options?: PiWebApiClientOptions
): Promise<Tag> {
  const encodedPath = encodeURIComponent(path)
  const point = await piWebApiRequest<PiWebApiPoint>(
    `points?path=${encodedPath}`,
    options
  )
  return normalizePoint(point)
}

function normalizePoint(point: PiWebApiPoint): Tag {
  return {
    id: point.WebId,
    name: point.Name,
    path: point.Path,
    description: point.Descriptor,
    valueType: point.PointType,
    engineeringUnit: point.EngineeringUnits,
  }
}
