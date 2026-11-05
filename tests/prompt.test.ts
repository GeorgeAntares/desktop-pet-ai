import { describe, expect, it } from 'vitest'
import { buildMessages, defaultPrompts, renderTemplate } from '../electron/ai/prompt'

describe('renderTemplate', () => {
  it('fills known variables', () => {
    expect(renderTemplate('用{{style}}总结：{{text}}', { style: '简洁', text: '你好' })).toBe('用简洁总结：你好')
  })

  it('throws when a variable is missing', () => {
    expect(() => renderTemplate('{{text}} {{missing}}', { text: 'a' })).toThrow(/missing/)
  })

  it('keeps dollar sequences as literal text', () => {
    expect(renderTemplate('{{text}}', { text: '$& $1' })).toBe('$& $1')
  })

  it('renders the built-in summarize prompt', () => {
    const messages = buildMessages('summarize', defaultPrompts.summarize.template, {
      text: '桌宠会看剪贴板',
      target_lang: '英文',
      style: '要点',
    })
    expect(messages[1]?.content).toContain('桌宠会看剪贴板')
    expect(messages[1]?.content).toContain('要点')
    expect(messages[0]?.role).toBe('system')
  })
})
