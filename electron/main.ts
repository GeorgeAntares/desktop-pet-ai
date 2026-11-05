import { app, BrowserWindow, clipboard, ipcMain, screen } from 'electron'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { ActionId, RunActionRequest, SettingsPatch } from '../shared/types'
import { createProvider } from './ai'
import { checkOllama } from './ai/ollama'
import { buildMessages, defaultPrompts } from './ai/prompt'
import { NoProviderError, chooseProvider } from './ai/router'
import { noteOwnClipboard, readClipboardPayload, startClipboard, stopClipboard } from './clipboard'
import { rememberSuccess, varsFromMemory } from './memory'
import { registerHotkey, unregisterHotkeys } from './shortcut'
import {
  effectiveCloudApiKey,
  getRecent,
  getSettings,
  setPromptOverride,
  setWindowPosition,
  updateSettings,
} from './store'
import { createTray } from './tray'

const MAX_TEXT = 8000
const MAX_TEMPLATE = 4000

let win: BrowserWindow | null = null
let quitting = false
const inflight = new Map<string, AbortController>()
let ollamaCache: { url: string; ok: boolean; at: number } | null = null
let moveTimer: NodeJS.Timeout | null = null

const logPath = join(tmpdir(), 'desktop-pet-ai.log')

function log(message: string): void {
  const line = `[pet] ${new Date().toISOString()} ${message}`
  console.log(line)
  try {
    appendFileSync(logPath, `${line}\n`)
  } catch {
    // 日志写失败不影响主流程
  }
}

function loadDotEnv(): void {
  const files = [resolve(process.cwd(), '.env'), resolve(app.getAppPath(), '.env')]
  for (const file of files) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}

function toUserMessage(err: unknown): string {
  if (err instanceof NoProviderError) {
    return '没有可用的模型。请在设置里填写云端 API Key，或启动本地 Ollama。'
  }
  const msg = err instanceof Error ? err.message : '未知错误'
  if (/\(401\)/.test(msg)) return '云端 API Key 无效或未授权。'
  if (/\(403\)/.test(msg)) return '云端拒绝了这次请求。'
  if (/\(404\)/.test(msg)) return '模型不存在，或 Base URL 不正确。'
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(msg)) {
    return '连不上模型服务。请检查网络、Base URL，或确认 Ollama 已启动。'
  }
  return msg.length > 180 ? `${msg.slice(0, 180)}…` : msg
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

function promptViews() {
  const overrides = getSettings().promptOverrides
  return (Object.keys(defaultPrompts) as ActionId[]).map((id) => {
    const file = defaultPrompts[id]
    const custom = overrides[id]
    const customized = typeof custom === 'string' && custom.trim().length > 0
    return {
      id,
      name: file.name,
      version: file.version,
      template: customized ? custom : file.template,
      defaultTemplate: file.template,
      customized,
    }
  })
}

function activeTemplate(id: ActionId): string {
  return promptViews().find((item) => item.id === id)?.template ?? defaultPrompts[id].template
}

async function ollamaHealthy(url: string): Promise<boolean> {
  const now = Date.now()
  if (ollamaCache && ollamaCache.url === url && now - ollamaCache.at < 10_000) return ollamaCache.ok
  const ok = await checkOllama(url)
  ollamaCache = { url, ok, at: now }
  return ok
}

function send(channel: string, payload: unknown): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(channel, payload)
}

function isAction(value: unknown): value is ActionId {
  return value === 'summarize' || value === 'translate'
}

function parseRun(raw: unknown): RunActionRequest {
  if (!raw || typeof raw !== 'object') throw new Error('无效请求')
  const body = raw as Partial<RunActionRequest>
  if (typeof body.requestId !== 'string' || body.requestId.length === 0) throw new Error('无效请求')
  if (!isAction(body.action)) throw new Error('未知动作')
  if (typeof body.text !== 'string' || body.text.trim().length === 0) throw new Error('剪贴板是空的')
  if (body.text.length > MAX_TEXT) throw new Error('文本超过 8000 字')
  return { requestId: body.requestId, action: body.action, text: body.text }
}

async function execute(req: RunActionRequest): Promise<void> {
  inflight.get(req.requestId)?.abort()
  const controller = new AbortController()
  inflight.set(req.requestId, controller)
  try {
    const settings = getSettings()
    const apiKey = effectiveCloudApiKey(settings)
    const healthy = await ollamaHealthy(settings.ollamaBaseUrl)
    const providerId = chooseProvider({
      mode: settings.routeMode,
      textLength: req.text.length,
      ollamaHealthy: healthy,
      cloudConfigured: apiKey.length > 0,
    })
    const provider = createProvider(providerId, settings, apiKey)
    const messages = buildMessages(req.action, activeTemplate(req.action), varsFromMemory(req.text))
    log(`${req.action} via ${provider.id}/${provider.model} chars=${req.text.length}`)
    for await (const delta of provider.chat(messages, controller.signal)) {
      if (controller.signal.aborted) break
      send('ai:token', { requestId: req.requestId, delta })
    }
    if (controller.signal.aborted) {
      send('ai:done', { requestId: req.requestId, aborted: true })
      return
    }
    rememberSuccess(req.action, req.text, provider.id)
    send('ai:done', {
      requestId: req.requestId,
      aborted: false,
      providerLabel: `${provider.name} · ${provider.model}`,
    })
  } catch (err) {
    if (controller.signal.aborted || isAbort(err)) {
      send('ai:done', { requestId: req.requestId, aborted: true })
      return
    }
    log(err instanceof Error ? err.message : String(err))
    send('ai:error', { requestId: req.requestId, message: toUserMessage(err) })
  } finally {
    if (inflight.get(req.requestId) === controller) inflight.delete(req.requestId)
  }
}

function placeWindow(window: BrowserWindow): void {
  const saved = getSettings().windowPosition
  const area = screen.getPrimaryDisplay().workArea
  const bounds = window.getBounds()
  let x = area.x + area.width - bounds.width - 24
  let y = area.y + area.height - bounds.height - 24
  if (saved) {
    x = saved.x
    y = saved.y
  }
  x = Math.min(Math.max(x, area.x), area.x + area.width - bounds.width)
  y = Math.min(Math.max(y, area.y), area.y + area.height - bounds.height)
  window.setPosition(Math.round(x), Math.round(y))
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 420,
    height: 640,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.setAlwaysOnTop(true, 'floating')
  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    log(`did-fail-load ${code} ${description} ${url}`)
  })
  window.webContents.on('did-finish-load', () => {
    log('did-finish-load')
  })
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level < 3) return
    log(`console ${sourceId}:${line} ${message}`)
  })
  window.once('ready-to-show', () => {
    placeWindow(window)
    window.showInactive()
    window.setIgnoreMouseEvents(true, { forward: true })
    const bounds = window.getBounds()
    log(`shown ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height} visible=${window.isVisible()}`)
  })
  window.on('moved', () => {
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      const [x, y] = window.getPosition()
      setWindowPosition({ x, y })
    }, 300)
  })
  window.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      window.hide()
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  return window
}

function registerIpc(): void {
  ipcMain.handle('ai:run', (_event, raw: unknown) => {
    const req = parseRun(raw)
    void execute(req)
    return { requestId: req.requestId }
  })
  ipcMain.handle('ai:abort', (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return
    inflight.get(requestId)?.abort()
  })
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_event, patch: unknown) => {
    if (!patch || typeof patch !== 'object') throw new Error('无效设置')
    ollamaCache = null
    return updateSettings(patch as SettingsPatch)
  })
  ipcMain.handle('prompts:get', () => promptViews())
  ipcMain.handle('prompts:save', (_event, id: unknown, template: unknown) => {
    if (!isAction(id)) throw new Error('未知 Prompt')
    if (typeof template !== 'string' || template.trim().length === 0) throw new Error('Prompt 不能为空')
    if (template.length > MAX_TEMPLATE) throw new Error('Prompt 过长')
    const normalized = template.trim()
    setPromptOverride(id, normalized === defaultPrompts[id].template.trim() ? null : normalized)
    return promptViews()
  })
  ipcMain.handle('prompts:reset', (_event, id: unknown) => {
    if (!isAction(id)) throw new Error('未知 Prompt')
    setPromptOverride(id, null)
    return promptViews()
  })
  ipcMain.handle('providers:check', async () => {
    const settings = getSettings()
    ollamaCache = null
    const fromSettings = settings.cloudApiKey.trim().length > 0
    const cloudFromEnv = !fromSettings && Boolean(process.env.XAI_API_KEY?.trim())
    return {
      ollama: await ollamaHealthy(settings.ollamaBaseUrl),
      cloud: fromSettings || cloudFromEnv,
      cloudFromEnv,
    }
  })
  ipcMain.handle('memory:recent', () => getRecent())
  ipcMain.handle('clipboard:write', (_event, text: unknown) => {
    if (typeof text !== 'string' || text.length === 0) throw new Error('没有可复制的内容')
    noteOwnClipboard(text)
    clipboard.writeText(text)
  })
  ipcMain.on('window:click-through', (_event, ignore: unknown) => {
    if (!win || win.isDestroyed() || typeof ignore !== 'boolean') return
    if (ignore) win.setIgnoreMouseEvents(true, { forward: true })
    else win.setIgnoreMouseEvents(false)
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    win?.showInactive()
  })
  app.whenReady().then(() => {
    loadDotEnv()
    registerIpc()
    win = createWindow()
    createTray(win, () => {
      quitting = true
      app.quit()
    })
    startClipboard(() => win)
    if (!registerHotkey(() => send('hotkey:open', readClipboardPayload()))) {
      log('热键 Ctrl+Shift+Space 注册失败')
    }
  })
  app.on('will-quit', () => {
    unregisterHotkeys()
    stopClipboard()
    for (const controller of inflight.values()) controller.abort()
  })
  app.on('window-all-closed', () => {
    // 窗口只是隐藏，进程留给托盘。
  })
}
