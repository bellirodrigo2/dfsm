import { describe, it, expect } from 'vitest'
import { normalizeUsername } from './user'

describe('normalizeUsername', () => {
  it('replaces backslash with underscore by default', () => {
    expect(normalizeUsername('COMPANY\\USER')).toBe('COMPANY_USER')
  })

  it('converts to uppercase by default', () => {
    expect(normalizeUsername('Company\\user')).toBe('COMPANY_USER')
  })

  it('handles multiple backslashes', () => {
    expect(normalizeUsername('DOMAIN\\SUB\\USER')).toBe('DOMAIN_SUB_USER')
  })

  it('uses custom replacement character', () => {
    expect(normalizeUsername('COMPANY\\USER', '-')).toBe('COMPANY-USER')
  })

  it('can disable uppercase', () => {
    expect(normalizeUsername('Company\\User', '_', false)).toBe('Company_User')
  })

  it('handles names without backslash', () => {
    expect(normalizeUsername('USER')).toBe('USER')
  })

  it('handles empty string', () => {
    expect(normalizeUsername('')).toBe('')
  })
})
