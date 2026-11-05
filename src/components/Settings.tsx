import { useEffect, useState } from 'react'
import type { AppSettings, PromptView, ProviderStatus, RecentItem, SummaryStyle } from '../../shared/types'

const STYLES: SummaryStyle[] = ['简洁', '详细', '要点']

export function Settings({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [prompts, setPrompts] = useState<PromptView[]>([])
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [nextSettings, nextPrompts, nextStatus, nextRecent] = await Promise.all([
        window.pet.getSettings(),
        window.pet.getPrompts(),
        window.pet.checkProviders(),
        window.pet.getRecent(),
      ])
      if (!alive) return
      setSettings(nextSettings)
      setPrompts(nextPrompts)
      setStatus(nextStatus)
      setRecent(nextRecent)
    })()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    if (!settings) return
    setBusy(true)
    setMessage('')
    try {
      const saved = await window.pet.saveSettings(settings)
      let nextPrompts = prompts
      for (const prompt of prompts) {
        nextPrompts = await window.pet.savePrompt(prompt.id, prompt.template)
      }
      setSettings(saved)
      setPrompts(nextPrompts)
      setStatus(await window.pet.checkProviders())
      setMessage('已保存')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
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

  return (
    <section className="settings hit" aria-label="设置">
      <header className="settings-bar">
        <strong>设置</strong>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </header>
      <div className="settings-body">
        <p className="lead">短文本优先走本地 Ollama，长文本走云端。也可以强制指定。</p>
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
          <input
            value={settings.ollamaModel}
            onChange={(event) => setSettings({ ...settings, ollamaModel: event.target.value })}
          />
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
        <p className="status-line">
          本地：{status ? (status.ollama ? '可达' : '不可达') : '…'}
          {' · '}
          云端：{status ? (status.cloud ? (status.cloudFromEnv ? '使用环境变量' : '已填写密钥') : '未配置') : '…'}
        </p>
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
                  current.map((item) => (item.id === prompt.id ? { ...item, template: event.target.value } : item)),
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
                  {item.action === 'summarize' ? '总结' : '翻译'} · {item.providerId === 'ollama' ? '本地' : '云端'} ·{' '}
                  {item.preview}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <footer className="settings-bar">
        <span>{message}</span>
        <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
          保存
        </button>
      </footer>
    </section>
  )
}
