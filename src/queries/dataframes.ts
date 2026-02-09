import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateDataFrameInput, UpdateDataFrameInput } from '../domain/dataframe'
import {
  listMyDataFrames,
  getDataFrameById,
  createNewDataFrame,
  updateExistingDataFrame,
  removeDataFrame,
} from '../services/dataframes'

// Query keys
export const dataframeKeys = {
  all: ['dataframes'] as const,
  mine: () => [...dataframeKeys.all, 'mine'] as const,
  public: () => [...dataframeKeys.all, 'public'] as const,
  shared: () => [...dataframeKeys.all, 'shared'] as const,
  detail: (id: string) => [...dataframeKeys.all, 'detail', id] as const,
}

/**
 * Query hook for listing user's DataFrames
 */
export function useMyDataFrames() {
  return useQuery({
    queryKey: dataframeKeys.mine(),
    queryFn: listMyDataFrames,
  })
}

/**
 * Query hook for a single DataFrame
 */
export function useDataFrame(id: string) {
  return useQuery({
    queryKey: dataframeKeys.detail(id),
    queryFn: () => getDataFrameById(id),
    enabled: !!id,
  })
}

/**
 * Mutation hook for creating a DataFrame
 */
export function useCreateDataFrame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDataFrameInput) => createNewDataFrame(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataframeKeys.mine() })
    },
  })
}

/**
 * Mutation hook for updating a DataFrame
 */
export function useUpdateDataFrame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDataFrameInput }) =>
      updateExistingDataFrame(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dataframeKeys.mine() })
      queryClient.setQueryData(dataframeKeys.detail(data.id), data)
    },
  })
}

/**
 * Mutation hook for deleting a DataFrame
 */
export function useDeleteDataFrame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeDataFrame(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: dataframeKeys.mine() })
      queryClient.removeQueries({ queryKey: dataframeKeys.detail(id) })
    },
  })
}
