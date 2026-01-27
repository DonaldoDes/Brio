/**
 * Generate a URL-friendly slug from a title
 *
 * @param title - The title to convert to a slug
 * @returns A lowercase, hyphenated slug without accents or special characters
 *
 * @example
 * generateSlug('Réunion: Équipe (2026)') // 'reunion-equipe-2026'
 * generateSlug('Hello World!') // 'hello-world'
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-|-$/g, '') || // Trim leading/trailing hyphens
    'untitled'
  )
}
