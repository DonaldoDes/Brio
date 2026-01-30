import { ref } from 'vue'

export interface ResizableOptions {
  min: number
  max: number
  defaultWidth: number
  onResize?: (width: number) => void
}

export function useResizable(options: ResizableOptions): {
  width: ReturnType<typeof ref<number>>
  isResizing: ReturnType<typeof ref<boolean>>
  startResize: (event: MouseEvent) => void
  reset: () => void
} {
  const { min, max, defaultWidth, onResize } = options

  const width = ref(defaultWidth)
  const isResizing = ref(false)

  function startResize(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    isResizing.value = true

    const startX = event.clientX
    const startWidth = width.value

    const handleMouseMove = (e: MouseEvent): void => {
      const delta = e.clientX - startX
      const newWidth = startWidth + delta

      // Clamp between min and max
      const clampedWidth = Math.max(min, Math.min(max, newWidth))
      width.value = clampedWidth

      if (onResize) {
        onResize(clampedWidth)
      }
    }

    const handleMouseUp = (): void => {
      isResizing.value = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function reset(): void {
    width.value = defaultWidth
    if (onResize) {
      onResize(width.value)
    }
  }

  return {
    width,
    isResizing,
    startResize,
    reset,
  }
}
