import type { ActionId, ProviderId } from '../shared/types'
import type { PromptVars } from './ai/prompt'
import { getSettings, pushRecent } from './store'

export function varsFromMemory(text: string): PromptVars {
  const settings = getSettings()
  return {
    text,
    target_lang: settings.targetLang || '中文',
    style: settings.summaryStyle || '简洁',
  }
}

export function rememberSuccess(action: ActionId, text: string, providerId: ProviderId): void {
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 42)
  pushRecent({
    action,
    preview,
    providerId,
    at: Date.now(),
  })
}
