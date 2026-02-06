/**
 * Removes markdown syntax from text, keeping only the plain text content.
 * 
 * @param text - The markdown text to strip
 * @returns Plain text without markdown syntax
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''

  let result = text

  // Remove code blocks (must be before inline code)
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    // Extract content between ``` markers
    return match.replace(/```[a-z]*\n?/g, '').replace(/```/g, '')
  })

  // Remove inline code
  result = result.replace(/`([^`]+)`/g, '$1')

  // Remove images (must be before links)
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // Remove links but keep text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove wikilinks but keep text
  result = result.replace(/\[\[([^\]]+)\]\]/g, '$1')

  // Remove Obsidian task markers [>], [-], [x], [X], [ ]
  result = result.replace(/\[[ >x-]\]/gi, '')

  // Remove bold with **
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1')

  // Remove bold with __
  result = result.replace(/__([^_]+)__/g, '$1')

  // Remove italic with *
  result = result.replace(/\*([^*]+)\*/g, '$1')

  // Remove italic with _
  result = result.replace(/_([^_]+)_/g, '$1')

  // Remove checkboxes
  result = result.replace(/- \[[xX ]\] /g, '')

  // Remove blockquotes (including nested >>)
  result = result.replace(/^>+\s*/gm, '')

  // Remove horizontal rules
  result = result.replace(/^(---+|===+|\*\*\*+)$/gm, '')

  // Remove headers
  result = result.replace(/^#{1,6}\s+/gm, '')

  // Remove list markers
  result = result.replace(/^[-*+]\s+/gm, '')
  result = result.replace(/^\d+\.\s+/gm, '')

  // Normalize whitespace
  result = result.replace(/\n+/g, ' ')
  result = result.replace(/\s+/g, ' ')
  result = result.trim()

  return result
}

/**
 * Formats a date as a relative time string (e.g., "2m ago", "Yesterday", "Jan 15")
 * 
 * @param date - The date to format (Date object or ISO string)
 * @returns Formatted relative date string
 */
export function formatRelativeDate(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  // Calculate difference in milliseconds
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Less than 1 hour: "Xm ago"
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? '1m ago' : `${diffMinutes}m ago`
  }
  
  // Less than 24 hours: "Xh ago"
  if (diffHours < 24) {
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`
  }
  
  // Less than or equal to 7 days: day of week (e.g., "Monday")
  if (diffDays <= 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[targetDate.getDay()]
  }
  
  // 7 days or more: short date (e.g., "Jan 15")
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[targetDate.getMonth()]} ${targetDate.getDate()}`
}
