#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('[Diagnostic] Starting Electron diagnostic...')
console.log('[Diagnostic] Project root:', projectRoot)

const electronPath = join(projectRoot, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')
const mainPath = join(projectRoot, 'dist-electron', 'main', 'index.js')

console.log('[Diagnostic] Electron path:', electronPath)
console.log('[Diagnostic] Main path:', mainPath)

const proc = spawn(electronPath, [mainPath], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    ELECTRON_ENABLE_LOGGING: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

console.log('[Diagnostic] Process spawned, PID:', proc.pid)

proc.stdout.on('data', (data) => {
  console.log('[Electron stdout]', data.toString().trim())
})

proc.stderr.on('data', (data) => {
  console.log('[Electron stderr]', data.toString().trim())
})

proc.on('error', (err) => {
  console.error('[Diagnostic] Process error:', err)
})

proc.on('exit', (code, signal) => {
  console.log('[Diagnostic] Process exited with code:', code, 'signal:', signal)
  process.exit(code || 0)
})

// Kill after 5 seconds
setTimeout(() => {
  console.log('[Diagnostic] Timeout reached, killing process')
  proc.kill('SIGTERM')
  setTimeout(() => {
    proc.kill('SIGKILL')
  }, 1000)
}, 5000)
