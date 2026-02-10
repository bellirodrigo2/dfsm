import { getUserInfo } from '../piwebapi'
import { getOrCreateUserElement } from '../piwebapi/userelements'
import { useAuthStore } from '../stores/auth'
import type { ApiError } from '../domain/errors'

/**
 * Fetch and initialize user authentication state
 * Also resolves/creates the user element in AF
 */
export async function initializeAuth(): Promise<void> {
  const authStore = useAuthStore()

  authStore.setLoading(true)
  authStore.setError(null)

  try {
    // Get user info from PI Web API
    const userInfo = await getUserInfo()
    authStore.setUser(userInfo)

    // If authenticated, get or create user element
    if (userInfo.isAuthenticated) {
      try {
        const userElementWebId = await getOrCreateUserElement(userInfo)
        authStore.setUserElementWebId(userElementWebId)
      } catch (error) {
        const err = error as Error
        console.error('Failed to resolve user element:', err.message)
        authStore.setError(`Failed to initialize user element: ${err.message}`)
        // Don't throw - user is authenticated but we couldn't create their element
        // This allows read-only access to continue
      }
    }
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
