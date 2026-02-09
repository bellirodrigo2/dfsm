import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const tagSearchOpen = ref(false)
  const globalLoading = ref(false)
  const globalError = ref<string | null>(null)

  function openTagSearch(): void {
    tagSearchOpen.value = true
  }

  function closeTagSearch(): void {
    tagSearchOpen.value = false
  }

  function setGlobalLoading(loading: boolean): void {
    globalLoading.value = loading
  }

  function setGlobalError(error: string | null): void {
    globalError.value = error
  }

  function clearGlobalError(): void {
    globalError.value = null
  }

  return {
    tagSearchOpen,
    globalLoading,
    globalError,
    openTagSearch,
    closeTagSearch,
    setGlobalLoading,
    setGlobalError,
    clearGlobalError,
  }
})
