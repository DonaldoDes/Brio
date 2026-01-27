/**
 * PGlite database client
 *
 * Wrapper around PGlite for type-safe database operations
 */

import { PGlite } from '@electric-sql/pglite'
import { randomUUID } from 'crypto'
import { statSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import type { Note } from '../../../shared/types/note'

export class PGliteDB {
  private db: PGlite | null = null
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async initialize(): Promise<void> {
    // Ensure parent directory exists
    const parentDir = dirname(this.dbPath)
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true })
    }

    this.db = new PGlite(this.dbPath)

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return await this.db.query(sql, params)
  }

  async createNote(title: string, content: string | null): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const id = randomUUID()
    await this.db.query('INSERT INTO notes (id, title, content) VALUES ($1, $2, $3)', [
      id,
      title,
      content,
    ])
    return id
  }

  async getNote(id: string): Promise<Note | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query('SELECT * FROM notes WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as Note
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query('SELECT * FROM notes ORDER BY created_at ASC')
    return result.rows as Note[]
  }

  async updateNote(id: string, title: string, content: string | null): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      'UPDATE notes SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id',
      [title, content, id]
    )

    if (result.rows.length === 0) {
      throw new Error(`Note with id ${id} not found`)
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query('DELETE FROM notes WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      throw new Error(`Note with id ${id} not found`)
    }
  }

  getDatabaseSize(): number {
    // For PGlite with file persistence, check the directory size
    if (!existsSync(this.dbPath)) {
      return 0
    }

    try {
      const stats = statSync(this.dbPath)
      if (stats.isDirectory()) {
        // PGlite creates a directory, sum all files
        let totalSize = 0
        const files = readdirSync(this.dbPath)
        for (const file of files) {
          const filePath = join(this.dbPath, file)
          const fileStats = statSync(filePath)
          if (fileStats.isFile()) {
            totalSize += fileStats.size
          }
        }
        return totalSize
      }
      return stats.size
    } catch (error) {
      console.error('Error getting database size:', error)
      return 0
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
    }
  }
}
