import { basename, resolve } from 'node:path'

export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
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
    values[key] = value
  }
  return values
}

export function applyEnv(text: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const applied: string[] = []
  for (const [key, value] of Object.entries(parseEnv(text))) {
    if (env[key] !== undefined) continue
    env[key] = value
    applied.push(key)
  }
  return applied
}

export function envCandidates(input: {
  cwd: string
  appPath: string
  exeDir: string
  userData: string
}): string[] {
  const files = [
    resolve(input.cwd, '.env'),
    resolve(input.appPath, '.env'),
    resolve(input.exeDir, '.env'),
    resolve(input.userData, '.env'),
  ]
  if (basename(input.exeDir).toLowerCase() === 'win-unpacked') {
    files.push(resolve(input.exeDir, '..', '..', '.env'))
  }
  return [...new Set(files)]
}
