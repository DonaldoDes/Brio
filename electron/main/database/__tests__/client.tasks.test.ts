/**
 * Tests for PGliteDB task parsing
 *
 * BUG-017: Task content concatenation without separator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PGliteDB } from '../client'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('PGliteDB - Task Parsing (BUG-017)', () => {
  let db: PGliteDB
  let tempDir: string

  beforeEach(async () => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'brio-test-'))
    db = new PGliteDB(join(tempDir, 'test.db'))
    await db.initialize()
  })

  afterEach(async () => {
    await db.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should extract only the first line of task content', async () => {
    // Create a note with a task followed by additional lines
    const content = `# Test Note

- [x] Tâche terminée
Premiere ligne
Deuxieme ligne

- [ ] Autre tâche`

    const noteId = await db.createNote('Test Note', 'test-note', content)
    const tasks = await db.getTasksByNote(noteId)

    expect(tasks).toHaveLength(2)

    // First task should only contain "Tâche terminée", not the following lines
    expect(tasks[0].content).toBe('Tâche terminée')
    expect(tasks[0].content).not.toContain('Premiere ligne')
    expect(tasks[0].content).not.toContain('Deuxieme ligne')
    expect(tasks[0].status).toBe('done')

    // Second task
    expect(tasks[1].content).toBe('Autre tâche')
    expect(tasks[1].status).toBe('pending')
  })

  it('should handle tasks with inline content only', async () => {
    const content = `- [ ] Simple task
- [x] Completed task with more text on same line`

    const noteId = await db.createNote('Simple Tasks', 'simple-tasks', content)
    const tasks = await db.getTasksByNote(noteId)

    expect(tasks).toHaveLength(2)
    expect(tasks[0].content).toBe('Simple task')
    expect(tasks[1].content).toBe('Completed task with more text on same line')
  })

  it('should not include non-task lines in task content', async () => {
    const content = `- [x] Task one
This is not a task
Neither is this

- [ ] Task two`

    const noteId = await db.createNote('Mixed Content', 'mixed-content', content)
    const tasks = await db.getTasksByNote(noteId)

    expect(tasks).toHaveLength(2)
    expect(tasks[0].content).toBe('Task one')
    expect(tasks[0].content).not.toContain('This is not a task')
    expect(tasks[1].content).toBe('Task two')
  })

  it('should handle tasks with special characters', async () => {
    const content = `- [ ] Tâche avec accents éèà
- [x] Task with [[wikilink]]
- [>] Task with #tag`

    const noteId = await db.createNote('Special Chars', 'special-chars', content)
    const tasks = await db.getTasksByNote(noteId)

    expect(tasks).toHaveLength(3)
    expect(tasks[0].content).toBe('Tâche avec accents éèà')
    expect(tasks[1].content).toBe('Task with [[wikilink]]')
    expect(tasks[2].content).toBe('Task with #tag')
  })

  it('should handle empty lines between tasks', async () => {
    const content = `- [ ] First task

- [x] Second task

- [-] Third task`

    const noteId = await db.createNote('Empty Lines', 'empty-lines', content)
    const tasks = await db.getTasksByNote(noteId)

    expect(tasks).toHaveLength(3)
    expect(tasks[0].content).toBe('First task')
    expect(tasks[1].content).toBe('Second task')
    expect(tasks[2].content).toBe('Third task')
  })
})
