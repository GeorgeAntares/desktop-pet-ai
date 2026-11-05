import { describe, expect, it } from 'vitest'
import { NoProviderError, chooseProvider } from '../electron/ai/router'

const base = {
  textLength: 20,
  ollamaHealthy: true,
  cloudConfigured: true,
}

describe('chooseProvider', () => {
  it('uses ollama for short text when auto and local is healthy', () => {
    expect(chooseProvider({ ...base, mode: 'auto', textLength: 100 })).toBe('ollama')
  })

  it('uses cloud for long text when auto', () => {
    expect(chooseProvider({ ...base, mode: 'auto', textLength: 800 })).toBe('cloud')
  })

  it('falls back to cloud when auto local is down', () => {
    expect(chooseProvider({ ...base, mode: 'auto', textLength: 10, ollamaHealthy: false })).toBe('cloud')
  })

  it('falls back to ollama when cloud mode has no key', () => {
    expect(chooseProvider({ ...base, mode: 'cloud', cloudConfigured: false })).toBe('ollama')
  })

  it('uses ollama for long text when cloud is not configured', () => {
    expect(
      chooseProvider({ ...base, mode: 'auto', textLength: 900, cloudConfigured: false }),
    ).toBe('ollama')
  })

  it('throws when neither side is available', () => {
    expect(() =>
      chooseProvider({ mode: 'auto', textLength: 10, ollamaHealthy: false, cloudConfigured: false }),
    ).toThrow(NoProviderError)
  })
})
