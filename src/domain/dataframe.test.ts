import { describe, it, expect } from 'vitest'
import { validateDataFrameName, isReservedMetadataKey } from './dataframe'

describe('validateDataFrameName', () => {
  it('accepts valid name', () => {
    expect(validateDataFrameName('production_metrics')).toEqual({ valid: true })
  })

  it('accepts name with spaces', () => {
    expect(validateDataFrameName('My DataFrame')).toEqual({ valid: true })
  })

  it('accepts name with dots', () => {
    expect(validateDataFrameName('data.frame.v1')).toEqual({ valid: true })
  })

  it('rejects empty name', () => {
    const result = validateDataFrameName('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name is required')
  })

  it('rejects whitespace-only name', () => {
    const result = validateDataFrameName('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name is required')
  })

  it('rejects name over 255 characters', () => {
    const longName = 'a'.repeat(256)
    const result = validateDataFrameName(longName)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name must be 255 characters or less')
  })

  it('rejects name with asterisk', () => {
    const result = validateDataFrameName('test*name')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name contains invalid characters')
  })

  it('rejects name with backslash', () => {
    const result = validateDataFrameName('test\\name')
    expect(result.valid).toBe(false)
  })

  it('rejects name with brackets', () => {
    expect(validateDataFrameName('test[1]').valid).toBe(false)
    expect(validateDataFrameName('test{1}').valid).toBe(false)
  })
})

describe('isReservedMetadataKey', () => {
  it('returns true for reserved keys', () => {
    expect(isReservedMetadataKey('_DESCRIPTION_')).toBe(true)
    expect(isReservedMetadataKey('_ROLE_')).toBe(true)
    expect(isReservedMetadataKey('_X_')).toBe(true)
  })

  it('returns false for regular keys', () => {
    expect(isReservedMetadataKey('description')).toBe(false)
    expect(isReservedMetadataKey('_prefix')).toBe(false)
    expect(isReservedMetadataKey('suffix_')).toBe(false)
    expect(isReservedMetadataKey('normal_key')).toBe(false)
  })
})
