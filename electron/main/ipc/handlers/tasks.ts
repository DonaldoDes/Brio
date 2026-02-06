/**
 * Tasks IPC handlers
 *
 * Secure communication layer for tasks operations
 */

import { ipcMain } from 'electron'
import type { PGliteDB } from '../../database/client'
import type { Task, TaskWithNote, TaskStatus } from '../../../../shared/types/task'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Setup IPC handlers for tasks operations
 *
 * @param db - Initialized PGliteDB instance
 */
export function registerTasksHandlers(db: PGliteDB): void {
  // Get all tasks with note information
  ipcMain.handle(IPC_CHANNELS.TASKS.GET_ALL, async (): Promise<TaskWithNote[]> => {
    try {
      return await db.getAllTasks()
    } catch (error) {
      console.error('[IPC] tasks:getAll error:', error)
      throw error
    }
  })

  // Get tasks for a specific note
  ipcMain.handle(IPC_CHANNELS.TASKS.GET_BY_NOTE, async (_, noteId: string): Promise<Task[]> => {
    try {
      return await db.getTasksByNote(noteId)
    } catch (error) {
      console.error('[IPC] tasks:getByNote error:', error)
      throw error
    }
  })

  // Get tasks by status
  ipcMain.handle(
    IPC_CHANNELS.TASKS.GET_BY_STATUS,
    async (_, status: TaskStatus): Promise<TaskWithNote[]> => {
      try {
        return await db.getTasksByStatus(status)
      } catch (error) {
        console.error('[IPC] tasks:getByStatus error:', error)
        throw error
      }
    }
  )

  console.log('[IPC] Tasks handlers registered successfully')
}

/**
 * Remove all tasks IPC handlers (cleanup on app quit)
 */
export function cleanupTasksIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.TASKS.GET_ALL)
  ipcMain.removeHandler(IPC_CHANNELS.TASKS.GET_BY_NOTE)
  ipcMain.removeHandler(IPC_CHANNELS.TASKS.GET_BY_STATUS)
  console.log('[IPC] Tasks handlers removed')
}
