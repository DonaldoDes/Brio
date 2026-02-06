/**
 * DropdownMenu component types
 */

export type MenuItem =
  | {
      label: string
      icon?: string
      shortcut?: string
      disabled?: boolean
      separator?: never
      submenu?: MenuItem[]
      onSelect?: () => void
    }
  | {
      separator: true
      label?: never
      icon?: never
      shortcut?: never
      disabled?: never
      submenu?: never
      onSelect?: never
    }

export interface DropdownMenuProps {
  items: MenuItem[]
}
