import { getUserInfo } from '../piwebapi'
import { useAuthStore } from '../stores/auth'
import type { ApiError } from '../domain/errors'

/**
 * Fetch and initialize user authentication state
 */
export async function initializeAuth(): Promise<void> {
  const authStore = useAuthStore()

  authStore.setLoading(true)
  authStore.setError(null)

  try {
    const userInfo = await getUserInfo()
    authStore.setUser(userInfo)
  } catch (error) {
    const apiError = error as ApiError
    if (apiError.kind === 'Auth') {
      // User is not authenticated - they get read-only access
      authStore.setUser({
        identityType: 'Anonymous',
        name: 'Anonymous',
        isAuthenticated: false,
        sid: '',
      })
    } else {
      authStore.setError(apiError.message || 'Failed to load user info')
    }
  } finally {
    authStore.setLoading(false)
  }
}
