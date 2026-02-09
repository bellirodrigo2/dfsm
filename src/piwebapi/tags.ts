import type { Tag, TagSearchResult, TagSearchOptions } from '../domain/tag'
import type { PiWebApiPoint, PiWebApiItemsResponse } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'

/**
 * Search for PI Points (tags)
 */
export async function searchTags(
  options: TagSearchOptions & PiWebApiClientOptions
): Promise<TagSearchResult> {
  const { query, limit = 50, signal, ...clientOptions } = options

  if (!query || query.length < 2) {
    return { tags: [], hasMore: false }
  }

  // PI Web API search endpoint for points
  // Uses nameFilter with wildcard for partial matching
  const searchQuery = `*${query}*`
  const maxCount = limit + 1 // Request one extra to detect hasMore

  const response = await piWebApiRequest<PiWebApiItemsResponse<PiWebApiPoint>>(
    `points?nameFilter=${encodeURIComponent(searchQuery)}&maxCount=${maxCount}`,
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
