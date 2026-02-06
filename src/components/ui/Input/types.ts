/**
 * Input component types
 */

export interface InputProps {
  modelValue?: string
  type?: 'text' | 'search'
  placeholder?: string
  disabled?: boolean
  error?: boolean
  errorMessage?: string
  icon?: string
  id?: string
}
