import type { DataFrame, CreateDataFrameInput, UpdateDataFrameInput } from '../domain/dataframe'
import { validateDataFrameName } from '../domain/dataframe'
import {
  listDataFrames as apiListDataFrames,
  getDataFrame as apiGetDataFrame,
  createDataFrame as apiCreateDataFrame,
  updateDataFrame as apiUpdateDataFrame,
  deleteDataFrame as apiDeleteDataFrame,
} from '../piwebapi'
import { useAuthStore } from '../stores/auth'

/**
 * Get the current user's element WebId
 * This would normally be resolved from the API, but for now we'll need to track it
 */
let userElementWebId: string | null = null

export function setUserElementWebId(webId: string): void {
  userElementWebId = webId
}

export function getUserElementWebId(): string | null {
  return userElementWebId
}

/**
 * List all DataFrames owned by the current user
 */
export async function listMyDataFrames(): Promise<DataFrame[]> {
  if (!userElementWebId) {
    throw new Error('User element not initialized')
  }
  return apiListDataFrames(userElementWebId)
}

/**
 * Get a single DataFrame by ID
 */
export async function getDataFrameById(id: string): Promise<DataFrame> {
  return apiGetDataFrame(id)
}

/**
 * Create a new DataFrame
 */
export async function createNewDataFrame(input: CreateDataFrameInput): Promise<DataFrame> {
  // Validate name
  const validation = validateDataFrameName(input.name)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  if (!userElementWebId) {
    throw new Error('User element not initialized')
  }

  const authStore = useAuthStore()
  if (!authStore.user?.sid) {
    throw new Error('User not authenticated')
  }

  return apiCreateDataFrame(userElementWebId, input, authStore.user.sid)
}

/**
 * Update an existing DataFrame
 */
export async function updateExistingDataFrame(
  id: string,
  input: UpdateDataFrameInput
): Promise<DataFrame> {
  // Validate name if provided
  if (input.name !== undefined) {
    const validation = validateDataFrameName(input.name)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
  }

  return apiUpdateDataFrame(id, input)
}

/**
 * Delete a DataFrame
 */
export async function removeDataFrame(id: string): Promise<void> {
  return apiDeleteDataFrame(id)
}
