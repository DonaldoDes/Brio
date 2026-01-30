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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP DEFAULT NULL
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

      -- Full-Text Search indexes (case insensitive)
      CREATE INDEX IF NOT EXISTS idx_notes_title_lower ON notes (lower(title));
      CREATE INDEX IF NOT EXISTS idx_notes_content_lower ON notes (lower(content));
      
      -- Index for filtering deleted notes
      CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at);
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

    const result = await this.db.query(
      'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY created_at ASC'
    )
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

    // Soft delete: set deleted_at timestamp instead of physical deletion
    const result = await this.db.query(
      'UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      throw new Error(`Note with id ${id} not found or already deleted`)
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
      if (note?.content !== null && note?.content !== undefined && note.content.trim() !== '') {
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
        await this.db.query('UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2', [
          updatedContent,
          noteId,
        ])
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

  // ========== SEARCH OPERATIONS ==========

  /**
   * Remove accents from a string
   */
  private removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  /**
   * Search notes by query (case and accent insensitive)
   * Returns notes ranked by relevance (title matches > content matches)
   *
   * @param query - Search query (supports multiple words)
   * @returns Array of notes with search preview
   */
  async searchNotes(query: string): Promise<Array<Note & { preview?: string }>> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    if (!query || query.trim() === '') {
      // Empty query returns all notes
      return await this.getAllNotes()
    }

    // Get all notes and filter in JavaScript for accent-insensitive search
    const allNotes = await this.getAllNotes()
    console.log('[DB] searchNotes - allNotes count:', allNotes.length)
    console.log(
      '[DB] searchNotes - allNotes titles:',
      allNotes.map((n) => n.title)
    )

    // Normalize query: lowercase, remove accents
    const normalizedQuery = this.removeAccents(query.trim().toLowerCase())
    const words = normalizedQuery.split(/\s+/)
    console.log('[DB] searchNotes - normalized query:', normalizedQuery, 'words:', words)

    // Filter and rank notes
    const results = allNotes
      .map((note) => {
        const normalizedTitle = this.removeAccents(note.title.toLowerCase())
        const normalizedContent = this.removeAccents((note.content ?? '').toLowerCase())

        // Check if all words match in title or content
        const titleMatches = words.every((word) => normalizedTitle.includes(word))
        const contentMatches = words.every((word) => normalizedContent.includes(word))

        console.log(
          '[DB] searchNotes - note:',
          note.title,
          'normalizedTitle:',
          normalizedTitle,
          'titleMatches:',
          titleMatches
        )

        if (!titleMatches && !contentMatches) {
          return null
        }

        // Rank: 1 = title match, 2 = content match
        const rank = titleMatches ? 1 : 2

        // Generate preview from content
        let preview = ''
        if (note.content !== null && note.content.trim() !== '') {
          const firstWordIndex = normalizedContent.indexOf(words[0])
          if (firstWordIndex !== -1) {
            const start = Math.max(0, firstWordIndex - 50)
            const end = Math.min(note.content.length, firstWordIndex + 100)
            preview =
              (start > 0 ? '...' : '') +
              note.content.substring(start, end) +
              (end < note.content.length ? '...' : '')
          } else {
            preview = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')
          }
        }

        return { ...note, rank, preview }
      })
      .filter((note): note is Note & { rank: number; preview: string } => note !== null)
      .sort((a, b) => {
        // Sort by rank first, then by created_at (oldest first, consistent with getAllNotes)
        if (a.rank !== b.rank) {
          return a.rank - b.rank
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

    // Remove rank from returned objects
    return results.map(({ rank: _rank, ...note }) => note)
  }
}
