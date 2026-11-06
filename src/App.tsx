import { ActionMenu } from './components/ActionMenu'
import { Pet } from './components/Pet'
import { ResultBubble } from './components/ResultBubble'
import { Settings } from './components/Settings'
import { useClickThrough } from './hooks/useClickThrough'
import { usePetSession } from './hooks/usePetSession'

export function App() {
  useClickThrough()
  const session = usePetSession()

  return (
    <main className="stage">
      {session.settingsOpen || session.setupOpen ? (
        <Settings
          intent={session.setupOpen && !session.settingsOpen ? 'setup' : 'full'}
          onClose={() => {
            session.setSettingsOpen(false)
            session.setSetupOpen(false)
          }}
        />
      ) : (
        <>
          {session.bubble && (
            <ResultBubble
              bubble={session.bubble}
              onStop={session.stop}
              onCopy={() => void session.copyResult()}
              onClose={session.closeBubble}
              onConfigure={session.openSettings}
            />
          )}
          {session.menuOpen && (
            <ActionMenu
              onSummarize={() => void session.run('summarize')}
              onTranslate={() => void session.run('translate')}
              onIgnore={session.ignore}
            />
          )}
          <Pet state={session.petState} onOpenSettings={session.openSettings} />
        </>
      )}
    </main>
  )
}
