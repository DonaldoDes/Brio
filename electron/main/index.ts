import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { APP_ROOT, MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL } from './constants'
import { PGliteDB } from './database'
import { registerNotesHandlers, cleanupIPC } from './ipc/handlers/notes'
import { registerLinksHandlers, cleanupLinksIPC } from './ipc/handlers/links'
import { registerWindowHandlers, cleanupWindowIPC } from './ipc/handlers/window'

const _require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Set environment variables for compatibility
process.env.APP_ROOT = APP_ROOT
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST

// Re-export constants for backward compatibility
export { APP_ROOT, MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL }

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Disable GPU in test mode for offscreen rendering
if (process.env.NODE_ENV === 'test') {
  app.disableHardwareAcceleration()
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Skip single instance lock in test mode to allow parallel test execution
if (process.env.NODE_ENV !== 'test' && !app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let db: PGliteDB | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow(): Promise<void> {
  const isTest = process.env.NODE_ENV === 'test'
  console.log('[Main] Creating window, isTest:', isTest)

  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1200,
    height: 800,
    show: true, // Always show window (Playwright needs it visible)
    webPreferences: {
      preload,
      // offscreen: isTest, // REMOVED: Causes EXC_BAD_ACCESS crashes on macOS
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    // #298
    console.log('[Main] Loading dev server URL:', VITE_DEV_SERVER_URL)
    await win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged (but not in test mode)
    if (!isTest) {
      win.webContents.openDevTools()
    }
  } else {
    console.log('[Main] Loading index.html:', indexHtml)
    await win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    console.log('[Main] Window did-finish-load')
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

void app.whenReady().then(async () => {
  console.log('[Main] App ready, initializing...')
  
  // Disable default menu to allow keyboard shortcuts in renderer
  Menu.setApplicationMenu(null)

  // Initialize PGlite database
  const dbPath = path.join(app.getPath('userData'), 'brio-poc.db')
  console.log('[Main] Initializing database at:', dbPath)
  db = new PGliteDB(dbPath)
  await db.initialize()
  console.log('[Main] Database initialized')

  // Setup IPC handlers
  registerNotesHandlers(db)
  registerLinksHandlers(db)
  registerWindowHandlers()
  console.log('[Main] IPC handlers registered')

  // Create main window
  await createWindow()
  console.log('[Main] Window created')
})

app.on('window-all-closed', () => {
  win = null

  // Cleanup IPC handlers and close database
  cleanupIPC()
  cleanupLinksIPC()
  cleanupWindowIPC()
  if (db) {
    void db.close().then(() => {
      db = null
    })
  }

  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win && process.env.NODE_ENV !== 'test') {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    if (process.env.NODE_ENV !== 'test') {
      allWindows[0].focus()
    }
  } else {
    void createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg: string) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    void childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    void childWindow.loadFile(indexHtml, { hash: arg })
  }
})
