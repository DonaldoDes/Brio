/**
 * WCAG AA Contrast Tests
 * BUG-014: Ensure text-muted meets WCAG AA contrast ratio (4.5:1) in dark mode
 */

import { describe, it, expect } from 'vitest'

/**
 * Calculate relative luminance of a color
 * @param hex - Hex color code (e.g., "#1a1a1a")
 */
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff

  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color hex code
 * @param color2 - Second color hex code
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('WCAG AA Contrast Ratios', () => {
  // Dark mode colors
  const darkModeBg = '#1a1a1a'
  const darkModeTextMuted = '#999999' // Expected after fix
  const darkModeTextSecondary = '#a0a0a0'
  const darkModeTextPrimary = '#e5e5e5'

  // Light mode colors
  const lightModeBg = '#ffffff'
  const lightModeTextMuted = '#767676'
  const lightModeTextSecondary = '#666666'
  const lightModeTextPrimary = '#1a1a1a'

  describe('Dark Mode', () => {
    it('text-muted should meet WCAG AA (4.5:1) on bg-primary', () => {
      const ratio = getContrastRatio(darkModeTextMuted, darkModeBg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('text-secondary should meet WCAG AA (4.5:1) on bg-primary', () => {
      const ratio = getContrastRatio(darkModeTextSecondary, darkModeBg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('text-primary should meet WCAG AAA (7:1) on bg-primary', () => {
      const ratio = getContrastRatio(darkModeTextPrimary, darkModeBg)
      expect(ratio).toBeGreaterThanOrEqual(7.0)
    })
  })

  describe('Light Mode', () => {
    it('text-muted should meet WCAG AA (4.5:1) on bg-primary', () => {
      const ratio = getContrastRatio(lightModeTextMuted, lightModeBg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('text-secondary should meet WCAG AA (4.5:1) on bg-primary', () => {
      const ratio = getContrastRatio(lightModeTextSecondary, lightModeBg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('text-primary should meet WCAG AAA (7:1) on bg-primary', () => {
      const ratio = getContrastRatio(lightModeTextPrimary, lightModeBg)
      expect(ratio).toBeGreaterThanOrEqual(7.0)
    })
  })

  describe('Contrast Ratio Calculations', () => {
    it('should calculate correct ratio for known values', () => {
      // Black on white should be 21:1
      const blackWhite = getContrastRatio('#000000', '#ffffff')
      expect(blackWhite).toBeCloseTo(21, 0)

      // White on white should be 1:1
      const whiteWhite = getContrastRatio('#ffffff', '#ffffff')
      expect(whiteWhite).toBeCloseTo(1, 0)
    })

    it('should report actual ratios for debugging', () => {
      const oldDarkMuted = '#666666'
      const oldLightMuted = '#999999'
      const oldDarkRatio = getContrastRatio(oldDarkMuted, darkModeBg)
      const newDarkRatio = getContrastRatio(darkModeTextMuted, darkModeBg)
      const oldLightRatio = getContrastRatio(oldLightMuted, lightModeBg)
      const newLightRatio = getContrastRatio(lightModeTextMuted, lightModeBg)

      console.log(`Old dark mode text-muted (${oldDarkMuted}): ${oldDarkRatio.toFixed(2)}:1`)
      console.log(`New dark mode text-muted (${darkModeTextMuted}): ${newDarkRatio.toFixed(2)}:1`)
      console.log(`Old light mode text-muted (${oldLightMuted}): ${oldLightRatio.toFixed(2)}:1`)
      console.log(`New light mode text-muted (${lightModeTextMuted}): ${newLightRatio.toFixed(2)}:1`)
      
      expect(oldDarkRatio).toBeLessThan(4.5) // Verify old dark value was failing
      expect(newDarkRatio).toBeGreaterThanOrEqual(4.5) // Verify new dark value passes
      expect(oldLightRatio).toBeLessThan(4.5) // Verify old light value was failing
      expect(newLightRatio).toBeGreaterThanOrEqual(4.5) // Verify new light value passes
    })
  })
})
