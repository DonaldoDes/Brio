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
import type { NoteLink } from '../../../shared/types/link'

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
        slug TEXT NOT NULL UNIQUE,
        content TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS note_links (
        id TEXT PRIMARY KEY,
        from_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        to_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        to_note_title TEXT NOT NULL,
        alias TEXT,
        position_start INTEGER,
        position_end INTEGER,
        is_broken BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_links_from ON note_links(from_note_id);
      CREATE INDEX IF NOT EXISTS idx_links_to ON note_links(to_note_id);
    `)
  }

  async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return await this.db.query(sql, params)
  }

  async createNote(title: string, slug: string, content: string | null): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const id = randomUUID()
    await this.db.query('INSERT INTO notes (id, title, slug, content) VALUES ($1, $2, $3, $4)', [
      id,
      title,
      slug,
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

  async updateNote(id: string, title: string, slug: string, content: string | null): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      'UPDATE notes SET title = $1, slug = $2, content = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id',
      [title, slug, content, id]
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

  // ========== LINKS OPERATIONS ==========

  async createLink(
    fromNoteId: string,
    toNoteId: string | null,
    toNoteTitle: string,
    alias: string | null,
    positionStart: number,
    positionEnd: number
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const id = randomUUID()
    await this.db.query(
      'INSERT INTO note_links (id, from_note_id, to_note_id, to_note_title, alias, position_start, position_end) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, fromNoteId, toNoteId, toNoteTitle, alias, positionStart, positionEnd]
    )
    return id
  }

  async getOutgoingLinks(noteId: string): Promise<NoteLink[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query('SELECT * FROM note_links WHERE from_note_id = $1', [noteId])
    return result.rows as NoteLink[]
  }

  async getBacklinks(noteId: string): Promise<NoteLink[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // First, get the note's title
    const noteResult = await this.db.query('SELECT title FROM notes WHERE id = $1', [noteId])
    if (noteResult.rows.length === 0) {
      console.log(`[DB] getBacklinks: Note ${noteId} not found`)
      return []
    }
    const noteTitle = (noteResult.rows[0] as { title: string }).title
    console.log(`[DB] getBacklinks: Looking for backlinks to "${noteTitle}" (${noteId})`)

    // Get backlinks by matching either to_note_id OR to_note_title
    const result = await this.db.query(
      `SELECT 
        nl.*,
        n.title as from_note_title
      FROM note_links nl
      JOIN notes n ON nl.from_note_id = n.id
      WHERE nl.to_note_id = $1 OR nl.to_note_title = $2`,
      [noteId, noteTitle]
    )
    console.log(`[DB] getBacklinks: Found ${String(result.rows.length)} backlinks`)
    return result.rows as NoteLink[]
  }

  async updateLinksOnRename(oldTitle: string, newTitle: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Update note_links table
    await this.db.query('UPDATE note_links SET to_note_title = $1 WHERE to_note_title = $2', [
      newTitle,
      oldTitle,
    ])

    // Update content of notes that contain wikilinks to the old title
    // Find all notes with links to the old title
    const notesWithLinks = await this.db.query(
      'SELECT DISTINCT from_note_id FROM note_links WHERE to_note_title = $1',
      [newTitle] // Use newTitle because we just updated the table
    )

    // For each note, update its content
    for (const row of notesWithLinks.rows) {
      const noteId = row.from_note_id as string
      const note = await this.getNote(noteId)
      if (note?.content) {
        // Replace [[oldTitle]] and [[oldTitle|alias]] with new title
        const updatedContent = note.content
          .replace(
            new RegExp(`\\[\\[${oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g'),
            `[[${newTitle}]]`
          )
          .replace(
            new RegExp(`\\[\\[${oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\|`, 'g'),
            `[[${newTitle}|`
          )
        
        // Update the note content
        await this.db.query(
          'UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2',
          [updatedContent, noteId]
        )
      }
    }
  }

  async markLinksBroken(toNoteTitle: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.query('UPDATE note_links SET is_broken = TRUE WHERE to_note_title = $1', [
      toNoteTitle,
    ])
  }

  async deleteLinksByNote(noteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.query('DELETE FROM note_links WHERE from_note_id = $1', [noteId])
  }
}
