import { useEffect, useState } from 'react'
import type {
  AppSettings,
  PromptView,
  ProviderProbe,
  ProviderStatus,
  RecentItem,
  SummaryStyle,
} from '../../shared/types'

const STYLES: SummaryStyle[] = ['简洁', '详细', '要点']

export function Settings({
  intent,
  onClose,
}: {
  intent: 'setup' | 'full'
  onClose: () => void
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [prompts, setPrompts] = useState<PromptView[]>([])
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [nextSettings, nextPrompts, nextRecent] = await Promise.all([
        window.pet.getSettings(),
        window.pet.getPrompts(),
        window.pet.getRecent(),
      ])
      if (!alive) return
      setSettings(nextSettings)
      setPrompts(nextPrompts)
      setRecent(nextRecent)
      const nextStatus = await window.pet.checkProviders({
        ollamaBaseUrl: nextSettings.ollamaBaseUrl,
        ollamaModel: nextSettings.ollamaModel,
        cloudBaseUrl: nextSettings.cloudBaseUrl,
        cloudModel: nextSettings.cloudModel,
        cloudApiKey: nextSettings.cloudApiKey,
        deep: true,
      })
      if (!alive) return
      setStatus(nextStatus)
    })()
    return () => {
      alive = false
    }
  }, [])

  function probeFrom(current: AppSettings): ProviderProbe {
    return {
      ollamaBaseUrl: current.ollamaBaseUrl,
      ollamaModel: current.ollamaModel,
      cloudBaseUrl: current.cloudBaseUrl,
      cloudModel: current.cloudModel,
      cloudApiKey: current.cloudApiKey,
      deep: true,
    }
  }

  async function detect() {
    if (!settings || busy) return
    setBusy(true)
    setMessage('')
    setStatus((current) => ({
      ollama: false,
      ollamaMessage: '检测中…',
      ollamaModels: current?.ollamaModels ?? [],
      cloud: Boolean(settings.cloudApiKey.trim()) || Boolean(current?.cloudFromEnv),
      cloudFromEnv: current?.cloudFromEnv ?? false,
      cloudReachable: false,
      cloudMessage: '检测中…',
    }))
    try {
      setStatus(await window.pet.checkProviders(probeFrom(settings)))
      setMessage('检测完成')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '检测失败')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!settings) return
    setBusy(true)
    setMessage('')
    try {
      const saved = await window.pet.saveSettings(settings)
      let nextPrompts = prompts
      if (intent === 'full') {
        for (const prompt of prompts) nextPrompts = await window.pet.savePrompt(prompt.id, prompt.template)
      } else {
        await window.pet.dismissSetup()
      }
      setSettings(saved)
      setPrompts(nextPrompts)
      setStatus(await window.pet.checkProviders(probeFrom(saved)))
      setMessage('已保存')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function later() {
    await window.pet.dismissSetup()
    onClose()
  }

  async function resetPrompt(id: PromptView['id']) {
    const next = await window.pet.resetPrompt(id)
    setPrompts(next)
    setMessage('已恢复默认 Prompt')
  }

  if (!settings) {
    return (
      <section className="settings hit">
        <p>正在读取设置…</p>
      </section>
    )
  }

  const ollamaModels = status?.ollamaModels ?? []
  const ollamaOptions = ollamaModels.includes(settings.ollamaModel)
    ? ollamaModels
    : [settings.ollamaModel, ...ollamaModels]

  return (
    <section className="settings hit" aria-label={intent === 'setup' ? '连接模型' : '设置'}>
      <header className="settings-bar">
        <strong>{intent === 'setup' ? '先接上一个模型' : '设置'}</strong>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </header>
      <div className="settings-body">
        <p className="lead">
          {intent === 'setup'
            ? '云端填 API Key，或启动本地 Ollama。保存后会再检测一次，密钥只留在这台电脑上。'
            : '短文本优先走本地 Ollama，长文本走云端。改完可以先检测，再保存。'}
        </p>
        <div className="status-grid">
          <StatusCard label="本地" ok={status ? status.ollama : null} text={status?.ollamaMessage ?? '检测中…'} />
          <StatusCard
            label="云端"
            ok={status ? status.cloudReachable : null}
            text={status?.cloudMessage ?? '检测中…'}
          />
        </div>
        <label>
          路由
          <select
            value={settings.routeMode}
            onChange={(event) =>
              setSettings({ ...settings, routeMode: event.target.value as AppSettings['routeMode'] })
            }
          >
            <option value="auto">自动</option>
            <option value="ollama">只用本地</option>
            <option value="cloud">只用云端</option>
          </select>
        </label>
        <label>
          Ollama 地址
          <input
            value={settings.ollamaBaseUrl}
            onChange={(event) => setSettings({ ...settings, ollamaBaseUrl: event.target.value })}
          />
        </label>
        <label>
          Ollama 模型
          {ollamaModels.length > 0 ? (
            <select
              value={settings.ollamaModel}
              onChange={(event) => setSettings({ ...settings, ollamaModel: event.target.value })}
            >
              {ollamaOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={settings.ollamaModel}
              onChange={(event) => setSettings({ ...settings, ollamaModel: event.target.value })}
            />
          )}
        </label>
        <label>
          云端 Base URL
          <input
            value={settings.cloudBaseUrl}
            onChange={(event) => setSettings({ ...settings, cloudBaseUrl: event.target.value })}
          />
        </label>
        <label>
          云端模型
          <input
            value={settings.cloudModel}
            onChange={(event) => setSettings({ ...settings, cloudModel: event.target.value })}
          />
        </label>
        <label>
          云端 API Key
          <input
            type="password"
            value={settings.cloudApiKey}
            placeholder={status?.cloudFromEnv ? '留空则使用环境变量 XAI_API_KEY' : 'xai-...'}
            onChange={(event) => setSettings({ ...settings, cloudApiKey: event.target.value })}
          />
        </label>
        {intent === 'full' && (
          <>
            <label>
              翻译目标语言
              <input
                value={settings.targetLang}
                onChange={(event) => setSettings({ ...settings, targetLang: event.target.value })}
              />
            </label>
            <label>
              总结风格
              <select
                value={settings.summaryStyle}
                onChange={(event) =>
                  setSettings({ ...settings, summaryStyle: event.target.value as SummaryStyle })
                }
              >
                {STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </label>
            {prompts.map((prompt) => (
              <label key={prompt.id}>
                <span className="prompt-label">
                  {prompt.name} Prompt
                  {prompt.customized ? '（已修改）' : ''}
                  <button type="button" className="textish" onClick={() => void resetPrompt(prompt.id)}>
                    恢复默认
                  </button>
                </span>
                <textarea
                  value={prompt.template}
                  onChange={(event) =>
                    setPrompts((current) =>
                      current.map((item) =>
                        item.id === prompt.id ? { ...item, template: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <div className="recent">
              <strong>最近记住的请求</strong>
              {recent.length === 0 ? (
                <p>还没有。</p>
              ) : (
                <ul>
                  {recent.map((item) => (
                    <li key={`${item.at}-${item.action}`}>
                      {item.action === 'summarize' ? '总结' : '翻译'} · {item.providerId === 'ollama' ? '本地' : '云端'}{' '}
                      · {item.preview}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
      <footer className="settings-bar">
        <span>{message}</span>
        <span className="bar-actions">
          <button type="button" disabled={busy} onClick={() => void detect()}>
            {busy ? '检测中…' : '重新检测'}
          </button>
          {intent === 'setup' && (
            <button type="button" onClick={() => void later()}>
              以后再说
            </button>
          )}
          <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
            保存
          </button>
        </span>
      </footer>
    </section>
  )
}

function StatusCard({ label, ok, text }: { label: string; ok: boolean | null; text: string }) {
  const tone = ok === null ? '' : ok ? ' is-ok' : ' is-bad'
  return (
    <div className={`status-card${tone}`}>
      <strong>{label}</strong>
      <span>{text}</span>
    </div>
  )
}
