import { describe, it, expect, beforeEach, vi } from 'vitest'
import { stripMarkdown, formatRelativeDate } from './textUtils'

describe('stripMarkdown', () => {
  it('should remove # from headers', () => {
    expect(stripMarkdown('# Header 1')).toBe('Header 1')
    expect(stripMarkdown('## Header 2')).toBe('Header 2')
    expect(stripMarkdown('### Header 3')).toBe('Header 3')
  })

  it('should remove ** from bold text', () => {
    expect(stripMarkdown('This is **bold** text')).toBe('This is bold text')
    expect(stripMarkdown('**Bold at start**')).toBe('Bold at start')
  })

  it('should remove __ from bold text', () => {
    expect(stripMarkdown('This is __bold__ text')).toBe('This is bold text')
  })

  it('should remove * from italic text', () => {
    expect(stripMarkdown('This is *italic* text')).toBe('This is italic text')
  })

  it('should remove _ from italic text', () => {
    expect(stripMarkdown('This is _italic_ text')).toBe('This is italic text')
  })

  it('should remove ` from inline code', () => {
    expect(stripMarkdown('This is `code` text')).toBe('This is code text')
  })

  it('should remove ``` from code blocks', () => {
    expect(stripMarkdown('```javascript\nconst x = 1;\n```')).toBe('const x = 1;')
    expect(stripMarkdown('```\ncode\n```')).toBe('code')
  })

  it('should remove checkbox syntax and keep text', () => {
    expect(stripMarkdown('- [ ] Todo item')).toBe('Todo item')
    expect(stripMarkdown('- [x] Done item')).toBe('Done item')
    expect(stripMarkdown('- [X] Done item')).toBe('Done item')
  })

  it('should remove image syntax', () => {
    expect(stripMarkdown('![alt text](image.png)')).toBe('')
    expect(stripMarkdown('Text ![image](url) more')).toBe('Text more')
  })

  it('should keep link text and remove URL', () => {
    expect(stripMarkdown('[Link text](https://example.com)')).toBe('Link text')
    expect(stripMarkdown('Visit [our site](url) for more')).toBe('Visit our site for more')
  })

  it('should remove wikilinks but keep text', () => {
    expect(stripMarkdown('[[Deuxième note]]')).toBe('Deuxième note')
    expect(stripMarkdown('Link to [[My Note]] here')).toBe('Link to My Note here')
    expect(stripMarkdown('[[Note 1]] and [[Note 2]]')).toBe('Note 1 and Note 2')
  })

  it('should remove Obsidian task markers', () => {
    expect(stripMarkdown('[>] Forwarded task')).toBe('Forwarded task')
    expect(stripMarkdown('[-] Cancelled task')).toBe('Cancelled task')
    expect(stripMarkdown('[x] Completed task')).toBe('Completed task')
    expect(stripMarkdown('[X] Completed task')).toBe('Completed task')
    expect(stripMarkdown('[ ] Todo task')).toBe('Todo task')
  })

  it('should remove > from blockquotes', () => {
    expect(stripMarkdown('> This is a quote')).toBe('This is a quote')
    expect(stripMarkdown('>> Nested quote')).toBe('Nested quote')
  })

  it('should remove horizontal rules', () => {
    expect(stripMarkdown('---')).toBe('')
    expect(stripMarkdown('===')).toBe('')
    expect(stripMarkdown('***')).toBe('')
  })

  it('should remove list markers', () => {
    expect(stripMarkdown('- List item')).toBe('List item')
    expect(stripMarkdown('* List item')).toBe('List item')
    expect(stripMarkdown('+ List item')).toBe('List item')
    expect(stripMarkdown('1. Numbered item')).toBe('Numbered item')
  })

  it('should handle complex markdown with multiple syntax elements', () => {
    const input = '# Title\n\nThis is **bold** and *italic* with `code` and [link](url)'
    const expected = 'Title This is bold and italic with code and link'
    expect(stripMarkdown(input)).toBe(expected)
  })

  it('should handle empty string', () => {
    expect(stripMarkdown('')).toBe('')
  })

  it('should handle plain text without markdown', () => {
    expect(stripMarkdown('Just plain text')).toBe('Just plain text')
  })

  it('should normalize whitespace', () => {
    expect(stripMarkdown('Text   with    spaces')).toBe('Text with spaces')
    expect(stripMarkdown('Text\n\nwith\n\nnewlines')).toBe('Text with newlines')
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 12:00:00
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  it('should format dates less than 1 hour as "Xm ago"', () => {
    const date1 = new Date('2024-01-15T11:59:00Z') // 1 minute ago
    const date2 = new Date('2024-01-15T11:30:00Z') // 30 minutes ago
    
    expect(formatRelativeDate(date1)).toBe('1m ago')
    expect(formatRelativeDate(date2)).toBe('30m ago')
  })

  it('should format dates less than 24 hours as "Xh ago"', () => {
    const date1 = new Date('2024-01-15T11:00:00Z') // 1 hour ago
    const date2 = new Date('2024-01-15T06:00:00Z') // 6 hours ago
    
    expect(formatRelativeDate(date1)).toBe('1h ago')
    expect(formatRelativeDate(date2)).toBe('6h ago')
  })

  it('should format dates less than 7 days as day of week', () => {
    const monday = new Date('2024-01-08T12:00:00Z') // 7 days ago (Monday)
    const sunday = new Date('2024-01-14T12:00:00Z') // Yesterday (Sunday)
    
    expect(formatRelativeDate(monday)).toBe('Monday')
    expect(formatRelativeDate(sunday)).toBe('Sunday')
  })

  it('should format dates 7 days or more as "Mon DD"', () => {
    const date1 = new Date('2024-01-01T12:00:00Z') // Jan 1
    const date2 = new Date('2023-12-25T12:00:00Z') // Dec 25
    
    expect(formatRelativeDate(date1)).toBe('Jan 1')
    expect(formatRelativeDate(date2)).toBe('Dec 25')
  })

  it('should handle ISO string dates', () => {
    const isoString = '2024-01-15T11:30:00Z'
    expect(formatRelativeDate(isoString)).toBe('30m ago')
  })

  it('should handle Date objects', () => {
    const dateObj = new Date('2024-01-15T11:30:00Z')
    expect(formatRelativeDate(dateObj)).toBe('30m ago')
  })
})
