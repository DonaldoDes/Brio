/**
 * API Service
 *
 * Type-safe wrapper around window.api (IPC)
 */

import type { BrioAPI } from '../../shared/types'

/**
 * Access the Brio API exposed via preload script
 *
 * @example
 * const notes = await api.notes.getAll()
 */
export const api: BrioAPI = window.api
