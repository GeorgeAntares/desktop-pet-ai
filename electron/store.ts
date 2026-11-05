import Store from 'electron-store'
import type {
  ActionId,
  AppSettings,
  RecentItem,
  RouteMode,
  SettingsPatch,
  SummaryStyle,
} from '../shared/types'

const ROUTE_MODES: RouteMode[] = ['auto', 'ollama', 'cloud']
const STYLES: SummaryStyle[] = ['简洁', '详细', '要点']

export const defaultSettings: AppSettings = {
  routeMode: 'auto',
  ollamaBaseUrl: 'http://127.0.0.1:11434/v1',
  ollamaModel: 'qwen2.5:7b',
  cloudBaseUrl: 'https://api.x.ai/v1',
  cloudModel: 'grok-4.7',
  cloudApiKey: '',
  targetLang: '英文',
  summaryStyle: '简洁',
  promptOverrides: {},
  windowPosition: null,
  recent: [],
}

const store = new Store<AppSettings>({
  name: 'desktop-pet-ai',
  defaults: defaultSettings,
})

export function getSettings(): AppSettings {
  const raw = store.store
  return {
    ...defaultSettings,
    ...raw,
    promptOverrides: { ...(raw.promptOverrides ?? {}) },
    recent: Array.isArray(raw.recent) ? raw.recent.slice(0, 5) : [],
    windowPosition: raw.windowPosition ?? null,
  }
}

export function effectiveCloudApiKey(settings = getSettings()): string {
  return settings.cloudApiKey.trim() || process.env.XAI_API_KEY?.trim() || ''
}

export function updateSettings(patch: SettingsPatch): AppSettings {
  const next = getSettings()
  if (patch.routeMode && ROUTE_MODES.includes(patch.routeMode)) next.routeMode = patch.routeMode
  if (typeof patch.ollamaBaseUrl === 'string') {
    next.ollamaBaseUrl = cleanUrl(patch.ollamaBaseUrl, defaultSettings.ollamaBaseUrl)
  }
  if (typeof patch.ollamaModel === 'string' && patch.ollamaModel.trim()) {
    next.ollamaModel = patch.ollamaModel.trim().slice(0, 120)
  }
  if (typeof patch.cloudBaseUrl === 'string') {
    next.cloudBaseUrl = cleanUrl(patch.cloudBaseUrl, defaultSettings.cloudBaseUrl)
  }
  if (typeof patch.cloudModel === 'string' && patch.cloudModel.trim()) {
    next.cloudModel = patch.cloudModel.trim().slice(0, 120)
  }
  if (typeof patch.cloudApiKey === 'string') next.cloudApiKey = patch.cloudApiKey.trim()
  if (typeof patch.targetLang === 'string' && patch.targetLang.trim()) {
    next.targetLang = patch.targetLang.trim().slice(0, 32)
  }
  if (patch.summaryStyle && STYLES.includes(patch.summaryStyle)) next.summaryStyle = patch.summaryStyle
  store.set(next)
  return getSettings()
}

export function setWindowPosition(position: { x: number; y: number }): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return
  store.set('windowPosition', { x: Math.round(position.x), y: Math.round(position.y) })
}

export function setPromptOverride(id: ActionId, template: string | null): void {
  const promptOverrides = { ...getSettings().promptOverrides }
  if (template === null) delete promptOverrides[id]
  else promptOverrides[id] = template
  store.set('promptOverrides', promptOverrides)
}

export function pushRecent(item: RecentItem): void {
  const recent = [item, ...getSettings().recent].slice(0, 5)
  store.set('recent', recent)
}

export function getRecent(): RecentItem[] {
  return getSettings().recent
}

function cleanUrl(url: string, fallback: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(trimmed)) return fallback
  return trimmed.slice(0, 300)
}
