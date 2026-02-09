import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '../domain/user'
import { normalizeUsername } from '../domain/user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value?.isAuthenticated ?? false)

  const displayName = computed(() => {
    if (!user.value) return 'Guest'
    // Extract just the username part (after backslash)
    const parts = user.value.name.split('\\')
    return parts[parts.length - 1]
  })

  const normalizedName = computed(() => {
    if (!user.value) return null
    return normalizeUsername(user.value.name)
  })

  function setUser(userInfo: UserInfo): void {
    user.value = userInfo
    error.value = null
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setError(errorMessage: string | null): void {
    error.value = errorMessage
  }

  function clearUser(): void {
    user.value = null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    displayName,
    normalizedName,
    setUser,
    setLoading,
    setError,
    clearUser,
  }
})
