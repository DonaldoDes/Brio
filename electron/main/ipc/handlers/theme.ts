import { ipcMain, nativeTheme } from 'electron'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Theme IPC Handlers
 *
 * Handles theme-related IPC communication between renderer and main process
 */

export function registerThemeHandlers(): void {
  console.log('[IPC] Registering theme handlers...')

  // Get current system theme
  ipcMain.handle(IPC_CHANNELS.THEME.GET_SYSTEM_THEME, () => {
    const isDark = nativeTheme.shouldUseDarkColors
    console.log('[IPC] theme:getSystemTheme ->', isDark ? 'dark' : 'light')
    return isDark ? 'dark' : 'light'
  })

  console.log('[IPC] Theme handlers registered successfully')
}

export function cleanupThemeIPC(): void {
  console.log('[IPC] Cleaning up theme handlers...')
  ipcMain.removeHandler(IPC_CHANNELS.THEME.GET_SYSTEM_THEME)
  console.log('[IPC] Theme handlers cleaned up')
}
