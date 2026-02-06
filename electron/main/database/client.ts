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
import type { Tag, TagWithCount } from '../../../shared/types/tag'
import type { Task, TaskWithNote, TaskStatus } from '../../../shared/types/task'

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
        type TEXT DEFAULT 'note',
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
      
      -- Remove duplicate links before creating unique index
      DELETE FROM note_links
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM note_links
        GROUP BY from_note_id, to_note_title, position_start, position_end
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique ON note_links(from_note_id, to_note_title, position_start, position_end);

      CREATE TABLE IF NOT EXISTS note_tags (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tags_note_id ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON note_tags(tag);

      CREATE TABLE IF NOT EXISTS note_tasks (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'deferred', 'cancelled')),
        line_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_note_id ON note_tasks(note_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON note_tasks(status);

      CREATE TABLE IF NOT EXISTS quick_captures (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_quick_captures_created_at ON quick_captures(created_at DESC);

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
    // Parse type from frontmatter
    const noteType = this.parseTypeFromFrontmatter(content ?? '')

    // Handle duplicate slugs by appending a number
    let finalSlug = slug
    let counter = 2
    let inserted = false
    while (!inserted) {
      try {
        await this.db.query(
          'INSERT INTO notes (id, title, slug, content, type) VALUES ($1, $2, $3, $4, $5)',
          [id, title, finalSlug, content, noteType]
        )
        inserted = true // Success, exit loop
      } catch (error: unknown) {
        // Check if error is due to unique constraint violation
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('unique constraint')) {
          finalSlug = `${slug}-${String(counter)}`
          counter++
        } else {
          throw error // Re-throw if it's a different error
        }
      }
    }

    // Create tags and tasks for the note
    if (content !== null && content.trim() !== '') {
      await this.createTagsForNote(id, content)
      await this.createTasksForNote(id, content)
    }

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
      'SELECT id, title, slug, content, type, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NULL ORDER BY created_at ASC'
    )
    return result.rows as Note[]
  }

  async updateNote(id: string, title: string, slug: string, content: string | null): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Parse type from frontmatter
    const noteType = this.parseTypeFromFrontmatter(content ?? '')

    // Handle duplicate slugs by appending a number (skip if slug belongs to current note)
    let finalSlug = slug
    let counter = 2
    let updated = false
    while (!updated) {
      try {
        const result = await this.db.query(
          'UPDATE notes SET title = $1, slug = $2, content = $3, type = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id',
          [title, finalSlug, content, noteType, id]
        )

        if (result.rows.length === 0) {
          throw new Error(`Note with id ${id} not found`)
        }
        updated = true // Success, exit loop
      } catch (error: unknown) {
        // Check if error is due to unique constraint violation
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('unique constraint')) {
          finalSlug = `${slug}-${String(counter)}`
          counter++
        } else {
          throw error // Re-throw if it's a different error
        }
      }
    }

    // Update tags: delete old tags and create new ones
    await this.deleteTagsByNote(id)
    if (content !== null && content.trim() !== '') {
      await this.createTagsForNote(id, content)
    }

    // Update tasks: delete old tasks and create new ones
    await this.deleteTasksByNote(id)
    if (content !== null && content.trim() !== '') {
      await this.createTasksForNote(id, content)
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

    // Delete links, tags, and tasks associated with this note
    // (CASCADE won't trigger on soft delete)
    await this.deleteLinksByNote(id)
    await this.deleteTagsByNote(id)
    await this.deleteTasksByNote(id)
  }

  async updateNoteType(id: string, type: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      'UPDATE notes SET type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [type, id]
    )

    if (result.rows.length === 0) {
      throw new Error(`Note with id ${id} not found`)
    }
  }

  /**
   * Parse type from frontmatter
   * Returns 'note' (default) if no type is specified
   */
  private parseTypeFromFrontmatter(content: string): string {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/m
    const frontmatterMatch = content.match(frontmatterRegex)

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const typeMatch = frontmatter.match(/type:\s*(\w+)/)
      if (typeMatch) {
        const type = typeMatch[1].trim()
        // Validate type is one of the predefined types
        const validTypes = ['note', 'project', 'person', 'meeting', 'daily']
        if (validTypes.includes(type)) {
          return type
        }
      }
    }

    return 'note' // default
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
    // Use ON CONFLICT DO NOTHING to prevent duplicates
    await this.db.query(
      'INSERT INTO note_links (id, from_note_id, to_note_id, to_note_title, alias, position_start, position_end) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (from_note_id, to_note_title, position_start, position_end) DO NOTHING',
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
    // Use DISTINCT ON to avoid duplicates when both conditions match
    const result = await this.db.query(
      `SELECT DISTINCT ON (nl.id)
        nl.*,
        n.title as from_note_title
      FROM note_links nl
      JOIN notes n ON nl.from_note_id = n.id
      WHERE nl.to_note_id = $1 OR nl.to_note_title = $2
      ORDER BY nl.id`,
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

  // ========== TAGS OPERATIONS ==========

  /**
   * Parse tags from content
   * Supports: #tag, #parent/child/subchild
   * Also parses frontmatter: tags: [tag1, tag2]
   */
  private parseTags(content: string): string[] {
    const tags = new Set<string>()

    // Parse inline tags: #tag or #parent/child
    const inlineRegex = /#([a-zA-Z0-9_/-]+)/g
    let match: RegExpExecArray | null
    while ((match = inlineRegex.exec(content)) !== null) {
      tags.add(match[1])
    }

    // Parse frontmatter tags: tags: [tag1, tag2] or tags: [tag1, tag2, parent/child]
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/m
    const frontmatterMatch = content.match(frontmatterRegex)
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/s)
      if (tagsMatch) {
        const tagsList = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
        tagsList.forEach((tag) => tags.add(tag))
      }
    }

    return Array.from(tags)
  }

  /**
   * Create tags for a note
   */
  async createTagsForNote(noteId: string, content: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tags = this.parseTags(content)

    for (const tag of tags) {
      const id = randomUUID()
      await this.db.query('INSERT INTO note_tags (id, note_id, tag) VALUES ($1, $2, $3)', [
        id,
        noteId,
        tag,
      ])
    }
  }

  /**
   * Delete all tags for a note
   */
  async deleteTagsByNote(noteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.query('DELETE FROM note_tags WHERE note_id = $1', [noteId])
  }

  /**
   * Get all tags with count
   */
  async getAllTags(): Promise<TagWithCount[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      `SELECT nt.tag, COUNT(*) as count 
       FROM note_tags nt
       INNER JOIN notes n ON nt.note_id = n.id
       WHERE n.deleted_at IS NULL
       GROUP BY nt.tag 
       ORDER BY nt.tag ASC`
    )

    return result.rows.map((row) => ({
      tag: row.tag as string,
      count: Number(row.count),
    }))
  }

  /**
   * Get tags for a specific note
   */
  async getTagsByNote(noteId: string): Promise<Tag[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query('SELECT * FROM note_tags WHERE note_id = $1', [noteId])
    return result.rows as Tag[]
  }

  /**
   * Get note IDs that have a specific tag
   */
  async getNotesByTag(tag: string): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      `SELECT nt.note_id 
       FROM note_tags nt
       INNER JOIN notes n ON nt.note_id = n.id
       WHERE nt.tag = $1 AND n.deleted_at IS NULL`,
      [tag]
    )
    return result.rows.map((row) => row.note_id as string)
  }

  // ========== TASKS OPERATIONS ==========

  /**
   * Parse tasks from content
   * Supports: - [ ], - [x], - [>], - [-]
   */
  private parseTasks(
    content: string
  ): Array<{ content: string; status: TaskStatus; line_number: number }> {
    const tasks: Array<{ content: string; status: TaskStatus; line_number: number }> = []
    // BUG-017: Normalize line endings before splitting
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedContent.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Match task patterns: - [ ], - [x], - [>], - [-]
      const taskRegex = /^[\s-]*\[([ x>-])\]\s+(.+)$/
      const match = taskRegex.exec(line)

      if (match) {
        const statusChar = match[1]
        // BUG-017: Limit task content to first sentence/phrase to avoid capturing concatenated lines
        // Split on patterns that indicate new content: capital letter after space, sentence end
        let taskContent = match[2].trim()

        // Truncate at first occurrence of patterns that suggest concatenated content
        const truncatePatterns = [
          /\s+[A-Z][a-z]{2,}/, // Space followed by capitalized word (likely new sentence)
          /[.!?]\s+\S/, // Sentence end followed by new content
        ]

        for (const pattern of truncatePatterns) {
          const truncateMatch = pattern.exec(taskContent)
          if (truncateMatch) {
            taskContent = taskContent.substring(0, truncateMatch.index).trim()
            break
          }
        }

        // Absolute safety: limit to 200 chars
        if (taskContent.length > 200) {
          taskContent = taskContent.substring(0, 200).trim()
        }

        // BUG-017: Log task content to verify parsing
        console.log('[parseTasks] Line:', line)
        console.log('[parseTasks] Extracted content:', JSON.stringify(taskContent))

        let status: TaskStatus
        switch (statusChar) {
          case ' ':
            status = 'pending'
            break
          case 'x':
            status = 'done'
            break
          case '>':
            status = 'deferred'
            break
          case '-':
            status = 'cancelled'
            break
          default:
            continue
        }

        tasks.push({
          content: taskContent,
          status,
          line_number: i,
        })
      }
    }

    return tasks
  }

  /**
   * Create tasks for a note
   */
  async createTasksForNote(noteId: string, content: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tasks = this.parseTasks(content)

    for (const task of tasks) {
      const id = randomUUID()
      await this.db.query(
        'INSERT INTO note_tasks (id, note_id, content, status, line_number) VALUES ($1, $2, $3, $4, $5)',
        [id, noteId, task.content, task.status, task.line_number]
      )
    }
  }

  /**
   * Delete all tasks for a note
   */
  async deleteTasksByNote(noteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.query('DELETE FROM note_tasks WHERE note_id = $1', [noteId])
  }

  /**
   * Get all tasks with note information
   */
  async getAllTasks(): Promise<TaskWithNote[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      `SELECT 
        t.*,
        n.title as note_title
      FROM note_tasks t
      JOIN notes n ON t.note_id = n.id
      WHERE n.deleted_at IS NULL
      ORDER BY t.created_at DESC`
    )

    return result.rows as TaskWithNote[]
  }

  /**
   * Get tasks for a specific note
   */
  async getTasksByNote(noteId: string): Promise<Task[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      'SELECT * FROM note_tasks WHERE note_id = $1 ORDER BY line_number ASC',
      [noteId]
    )
    return result.rows as Task[]
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<TaskWithNote[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      `SELECT 
        t.*,
        n.title as note_title
      FROM note_tasks t
      JOIN notes n ON t.note_id = n.id
      WHERE t.status = $1 AND n.deleted_at IS NULL
      ORDER BY t.created_at DESC`,
      [status]
    )

    return result.rows as TaskWithNote[]
  }

  /**
   * Save a quick capture entry and append to Inbox note
   *
   * @param content - The captured text
   */
  async saveQuickCapture(content: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 1. Save to quick_captures table for history
    const captureId = randomUUID()
    await this.db.query('INSERT INTO quick_captures (id, content) VALUES ($1, $2)', [
      captureId,
      content,
    ])

    // 2. Find or create Inbox note
    const inboxNote = await this.db.query(
      'SELECT * FROM notes WHERE title = $1 AND deleted_at IS NULL',
      ['Inbox']
    )

    let inboxId: string
    if (inboxNote.rows.length === 0) {
      // Create Inbox note
      inboxId = randomUUID()
      await this.db.query('INSERT INTO notes (id, title, slug, content) VALUES ($1, $2, $3, $4)', [
        inboxId,
        'Inbox',
        'inbox',
        '',
      ])
    } else {
      inboxId = (inboxNote.rows[0] as Note).id
    }

    // 3. Append content to Inbox note
    const currentNote = await this.getNote(inboxId)
    if (!currentNote) {
      throw new Error('Failed to retrieve Inbox note')
    }

    const existingContent = currentNote.content ?? ''
    const timestamp = new Date().toISOString()
    const newContent = existingContent
      ? `${existingContent}\n\n---\n\n**${timestamp}**\n${content}`
      : `**${timestamp}**\n${content}`

    await this.db.query(
      'UPDATE notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newContent, inboxId]
    )
  }

  /**
   * Get the last 50 quick capture entries
   *
   * @returns Array of capture content strings
   */
  async getQuickCaptureHistory(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = await this.db.query(
      'SELECT content FROM quick_captures ORDER BY created_at DESC LIMIT 50'
    )

    return result.rows.map((row: { content: string }) => row.content)
  }
}
