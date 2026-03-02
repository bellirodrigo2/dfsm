import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataServer } from '../piwebapi'

export const useDataServersStore = defineStore('dataservers', () => {
  const dataServers = ref<DataServer[]>([])
  const selectedDataServerId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedDataServer = computed(() => {
    if (!selectedDataServerId.value) return null
    return dataServers.value.find(ds => ds.id === selectedDataServerId.value) ?? null
  })

  const hasDataServers = computed(() => dataServers.value.length > 0)

  function setDataServers(servers: DataServer[]): void {
    dataServers.value = servers
    // Auto-select first server if none selected
    if (servers.length > 0 && !selectedDataServerId.value) {
      selectedDataServerId.value = servers[0]!.id
    }
  }

  function setSelectedDataServerId(id: string): void {
    selectedDataServerId.value = id
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setError(errorMessage: string | null): void {
    error.value = errorMessage
  }

  function clearDataServers(): void {
    dataServers.value = []
    selectedDataServerId.value = null
  }

  return {
    dataServers,
    selectedDataServerId,
    selectedDataServer,
    hasDataServers,
    loading,
    error,
    setDataServers,
    setSelectedDataServerId,
    setLoading,
    setError,
    clearDataServers,
  }
})
