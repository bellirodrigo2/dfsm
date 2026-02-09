import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no user', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('sets user correctly', () => {
    const store = useAuthStore()
    store.setUser({
      identityType: 'WindowsIdentity',
      name: 'COMPANY\\testuser',
      isAuthenticated: true,
      sid: 'S-1-5-21-1234',
    })

    expect(store.user).not.toBeNull()
    expect(store.isAuthenticated).toBe(true)
  })

  it('computes displayName from full name', () => {
    const store = useAuthStore()
    store.setUser({
      identityType: 'WindowsIdentity',
      name: 'COMPANY\\john.doe',
      isAuthenticated: true,
      sid: 'S-1-5-21-1234',
    })

    expect(store.displayName).toBe('john.doe')
  })

  it('returns Guest for displayName when no user', () => {
    const store = useAuthStore()
    expect(store.displayName).toBe('Guest')
  })

  it('computes normalizedName', () => {
    const store = useAuthStore()
    store.setUser({
      identityType: 'WindowsIdentity',
      name: 'Company\\User',
      isAuthenticated: true,
      sid: 'S-1-5-21-1234',
    })

    expect(store.normalizedName).toBe('COMPANY_USER')
  })

  it('handles loading state', () => {
    const store = useAuthStore()
    expect(store.loading).toBe(false)

    store.setLoading(true)
    expect(store.loading).toBe(true)

    store.setLoading(false)
    expect(store.loading).toBe(false)
  })

  it('handles error state', () => {
    const store = useAuthStore()
    expect(store.error).toBeNull()

    store.setError('Something went wrong')
    expect(store.error).toBe('Something went wrong')

    store.setError(null)
    expect(store.error).toBeNull()
  })

  it('clears user', () => {
    const store = useAuthStore()
    store.setUser({
      identityType: 'WindowsIdentity',
      name: 'COMPANY\\testuser',
      isAuthenticated: true,
      sid: 'S-1-5-21-1234',
    })

    store.clearUser()
    expect(store.user).toBeNull()
  })
})
