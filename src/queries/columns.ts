import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateColumnInput, UpdateColumnInput } from '../domain/column'
import {
  listDataFrameColumns,
  getColumnById,
  createNewColumn,
  updateExistingColumn,
  removeColumn,
} from '../services/columns'

// Query keys
export const columnKeys = {
  all: ['columns'] as const,
  byDataFrame: (dfId: string) => [...columnKeys.all, 'df', dfId] as const,
  detail: (id: string) => [...columnKeys.all, 'detail', id] as const,
}

/**
 * Query hook for listing columns in a DataFrame
 */
export function useDataFrameColumns(dataframeId: string) {
  return useQuery({
    queryKey: columnKeys.byDataFrame(dataframeId),
    queryFn: () => listDataFrameColumns(dataframeId),
    enabled: !!dataframeId,
  })
}

/**
 * Query hook for a single column
 */
export function useColumn(id: string) {
  return useQuery({
    queryKey: columnKeys.detail(id),
    queryFn: () => getColumnById(id),
    enabled: !!id,
  })
}

/**
 * Mutation hook for creating a column
 */
export function useCreateColumn(dataframeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateColumnInput) => createNewColumn(dataframeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.byDataFrame(dataframeId) })
    },
  })
}

/**
 * Mutation hook for updating a column
 */
export function useUpdateColumn(dataframeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateColumnInput }) =>
      updateExistingColumn(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: columnKeys.byDataFrame(dataframeId) })
      queryClient.setQueryData(columnKeys.detail(data.id), data)
    },
  })
}

/**
 * Mutation hook for deleting a column
 */
export function useDeleteColumn(dataframeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeColumn(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: columnKeys.byDataFrame(dataframeId) })
      queryClient.removeQueries({ queryKey: columnKeys.detail(id) })
    },
  })
}
