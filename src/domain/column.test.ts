import { describe, it, expect } from 'vitest'
import {
  validateColumnName,
  validateValueSource,
  getValueSourceTypeLabel,
} from './column'

describe('validateColumnName', () => {
  it('accepts valid name', () => {
    expect(validateColumnName('temperature')).toEqual({ valid: true })
  })

  it('accepts name with underscores', () => {
    expect(validateColumnName('sensor_value_1')).toEqual({ valid: true })
  })

  it('rejects empty name', () => {
    const result = validateColumnName('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Name is required')
  })

  it('rejects whitespace-only name', () => {
    const result = validateColumnName('   ')
    expect(result.valid).toBe(false)
  })

  it('rejects name over 255 characters', () => {
    const longName = 'a'.repeat(256)
    const result = validateColumnName(longName)
    expect(result.valid).toBe(false)
  })

  it('rejects name with brackets', () => {
    expect(validateColumnName('col[1]').valid).toBe(false)
    expect(validateColumnName('col{1}').valid).toBe(false)
  })

  it('rejects name with backslash', () => {
    expect(validateColumnName('path\\col').valid).toBe(false)
  })
})

describe('validateValueSource', () => {
  it('requires tag reference for PiTag', () => {
    expect(validateValueSource('PiTag', '').valid).toBe(false)
    expect(validateValueSource('PiTag', undefined).valid).toBe(false)
    expect(validateValueSource('PiTag', '\\\\SERVER\\TAG').valid).toBe(true)
  })

  it('requires value for FixedValue', () => {
    expect(validateValueSource('FixedValue', undefined).valid).toBe(false)
    expect(validateValueSource('FixedValue', '42').valid).toBe(true)
    expect(validateValueSource('FixedValue', '').valid).toBe(true) // empty string is valid
  })

  it('requires expression for Formula', () => {
    expect(validateValueSource('Formula', '').valid).toBe(false)
    expect(validateValueSource('Formula', undefined).valid).toBe(false)
    expect(validateValueSource('Formula', "'tag1' + 'tag2'").valid).toBe(true)
  })
})

describe('getValueSourceTypeLabel', () => {
  it('returns correct labels', () => {
    expect(getValueSourceTypeLabel('PiTag')).toBe('PI Tag')
    expect(getValueSourceTypeLabel('FixedValue')).toBe('Fixed Value')
    expect(getValueSourceTypeLabel('Formula')).toBe('Formula')
  })
})
