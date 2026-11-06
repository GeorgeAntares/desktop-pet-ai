import { describe, expect, it } from 'vitest'
import { applyEnv, envCandidates, parseEnv } from '../electron/env'

describe('parseEnv', () => {
  it('reads a key and ignores comments', () => {
    expect(parseEnv('# note\nXAI_API_KEY=abc\n\nEMPTY=')).toEqual({
      XAI_API_KEY: 'abc',
      EMPTY: '',
    })
  })

  it('strips matching quotes', () => {
    expect(parseEnv('XAI_API_KEY="secret value"')).toEqual({ XAI_API_KEY: 'secret value' })
  })

  it('does not override an existing variable', () => {
    const env: NodeJS.ProcessEnv = { XAI_API_KEY: 'already' }
    expect(applyEnv('XAI_API_KEY=new\nOTHER=1', env)).toEqual(['OTHER'])
    expect(env.XAI_API_KEY).toBe('already')
    expect(env.OTHER).toBe('1')
  })
})

describe('envCandidates', () => {
  it('also checks the project root when launched from win-unpacked', () => {
    const files = envCandidates({
      cwd: 'D:/桌宠/release/win-unpacked',
      appPath: 'D:/桌宠/release/win-unpacked/resources/app.asar',
      exeDir: 'D:/桌宠/release/win-unpacked',
      userData: 'C:/Users/me/AppData/Roaming/desktop-pet-ai',
    })
    expect(files.some((file) => file.replace(/\\/g, '/').endsWith('桌宠/.env'))).toBe(true)
    expect(files.some((file) => file.replace(/\\/g, '/').endsWith('win-unpacked/.env'))).toBe(true)
  })
})
