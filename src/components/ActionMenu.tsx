export function ActionMenu({
  onSummarize,
  onTranslate,
  onIgnore,
}: {
  onSummarize: () => void
  onTranslate: () => void
  onIgnore: () => void
}) {
  return (
    <div className="menu hit" role="menu" aria-label="剪贴板动作">
      <button type="button" onClick={onSummarize}>
        总结
      </button>
      <button type="button" onClick={onTranslate}>
        翻译
      </button>
      <button type="button" className="ghost" onClick={onIgnore}>
        忽略
      </button>
    </div>
  )
}
