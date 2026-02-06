/**
 * Web mode initialization
 *
 * Initializes PGlite with IndexedDB and exposes WebBrioAPI to window.api
 */

import { WebPGliteDB } from './database'
import { createWebBrioAPI } from './api'
import type { BrioAPI } from '../../shared/types/api'

/**
 * Detect if running in Electron
 */
export function isElectron(): boolean {
  // Check if window.api is already defined by Electron preload
  return !!(window as any).api?.notes
}

/**
 * Detect if running in test mode
 */
function isTestMode(): boolean {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('test') === 'true') return true
  
  // Check if Playwright is present
  if ((window as any).__playwright) return true
  
  return false
}

/**
 * Initialize Web API with PGlite
 * 
 * @returns Promise that resolves to the initialized BrioAPI
 */
export async function initWebApi(): Promise<BrioAPI> {
  // Use unique IndexedDB database for tests to ensure isolation
  let dbUrl: string
  if (isTestMode()) {
    // Check if we already have a DB name in sessionStorage (from a previous load/reload)
    let dbName = sessionStorage.getItem('brio-test-id')
    
    if (!dbName) {
      // First load in this browser context - generate a fresh unique database name
      dbName = `brio-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('brio-test-id', dbName)
    }
    
    dbUrl = `idb://${dbName}`
  } else {
    dbUrl = 'idb://brio-db'
  }
  
  const db = new WebPGliteDB(dbUrl)
  await db.initialize()
  
  const api = createWebBrioAPI(db)
  
  // Expose to window.api
  ;(window as any).api = api
  
  return api
}
