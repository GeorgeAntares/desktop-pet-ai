import { describe, expect, it } from 'vitest'
import { readErrorDetail, readModelIds } from '../electron/ai/probe'
import { normalizeApiKey } from '../electron/key'

describe('readModelIds', () => {
  it('reads ids from an OpenAI-style model list', () => {
    expect(readModelIds({ data: [{ id: 'grok-4.7' }, { id: ' ' }, { name: 'skip' }, null] })).toEqual(['grok-4.7'])
  })

  it('returns an empty list for other payloads', () => {
    expect(readModelIds({ models: ['qwen'] })).toEqual([])
    expect(readModelIds(null)).toEqual([])
  })
})

describe('readErrorDetail', () => {
  it('reads an OpenAI-style error message', () => {
    expect(readErrorDetail(503, '{"error":{"message":"无可用渠道"}}')).toBe('无可用渠道')
  })

  it('falls back to the status when the body is empty', () => {
    expect(readErrorDetail(401, '')).toBe('服务返回 401')
  })
})

describe('normalizeApiKey', () => {
  it('strips a pasted Bearer prefix and quotes', () => {
    expect(normalizeApiKey('  Bearer "sk-test"  ')).toBe('sk-test')
  })
})
