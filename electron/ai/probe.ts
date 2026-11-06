export function readModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  const ids: string[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const id = (item as { id?: unknown }).id
    if (typeof id === 'string' && id.trim()) ids.push(id.trim())
  }
  return ids
}

export interface ProbeResult {
  ok: boolean
  models: string[]
  message: string
}

export function readErrorDetail(status: number, body: string): string {
  const trimmed = body.trim()
  if (trimmed && !trimmed.startsWith('<')) {
    try {
      const json = JSON.parse(trimmed) as { error?: { message?: string } | string; message?: string }
      const message = typeof json.error === 'string' ? json.error : json.error?.message || json.message
      if (typeof message === 'string' && message.trim()) return message.trim().replace(/\s+/g, ' ').slice(0, 120)
    } catch {
      return trimmed.replace(/\s+/g, ' ').slice(0, 120)
    }
  }
  return `服务返回 ${status}`
}

export async function probeModels(baseUrl: string, apiKey?: string, timeoutMs = 4000): Promise<ProbeResult> {
  const root = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(root)) {
    return { ok: false, models: [], message: '地址需要以 http:// 或 https:// 开头' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  try {
    const response = await fetch(`${root}/models`, { headers, signal: controller.signal })
    if (!response.ok) return { ok: false, models: [], message: await failureMessage(response) }
    return { ok: true, models: readModelIds(await response.json()), message: '可达' }
  } catch {
    return { ok: false, models: [], message: '连不上' }
  } finally {
    clearTimeout(timer)
  }
}

export async function probeCloud(
  baseUrl: string,
  apiKey: string,
  model: string,
  options?: { chatFallback?: boolean; timeoutMs?: number },
): Promise<ProbeResult> {
  const timeoutMs = options?.timeoutMs ?? 8000
  if (options?.chatFallback) return probeChat(baseUrl, apiKey, model, timeoutMs)
  return probeModels(baseUrl, apiKey, timeoutMs)
}

async function probeChat(baseUrl: string, apiKey: string, model: string, timeoutMs: number): Promise<ProbeResult> {
  const root = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(root)) {
    return { ok: false, models: [], message: '地址需要以 http:// 或 https:// 开头' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${root}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, models: [], message: await failureMessage(response) }
    return { ok: true, models: [], message: '可达' }
  } catch {
    return { ok: false, models: [], message: '连不上' }
  } finally {
    clearTimeout(timer)
  }
}

async function failureMessage(response: Response): Promise<string> {
  const detail = readErrorDetail(response.status, await response.text())
  if ((response.status === 401 || response.status === 403) && detail.startsWith('服务返回')) {
    return '密钥无效或未授权'
  }
  return detail
}
