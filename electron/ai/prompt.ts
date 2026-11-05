import type { ActionId, ChatMessage } from '../../shared/types'
import summarize from '../../prompts/summarize.json'
import translate from '../../prompts/translate.json'

export interface PromptFile {
  id: ActionId
  name: string
  version: number
  template: string
}

function loadPrompt(
  file: { name: string; version: number; template: string },
  id: ActionId,
): PromptFile {
  return { id, name: file.name, version: file.version, template: file.template }
}

export const defaultPrompts: Record<ActionId, PromptFile> = {
  summarize: loadPrompt(summarize, 'summarize'),
  translate: loadPrompt(translate, 'translate'),
}

export interface PromptVars {
  text: string
  target_lang: string
  style: string
}

export function renderTemplate(template: string, vars: object): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) {
      throw new Error(`缺少 Prompt 变量：${key}`)
    }
    const value = (vars as Record<string, unknown>)[key]
    if (typeof value !== 'string') throw new Error(`缺少 Prompt 变量：${key}`)
    return value
  })
}

export function buildMessages(action: ActionId, template: string, vars: PromptVars): ChatMessage[] {
  const system =
    action === 'summarize'
      ? '你是桌面上的小助手。只输出用户要求的正文，不要加开场白或结束语。'
      : '你是桌面上的翻译助手。只输出译文，不要解释，不要加引号。'
  return [
    { role: 'system', content: system },
    { role: 'user', content: renderTemplate(template, vars) },
  ]
}
