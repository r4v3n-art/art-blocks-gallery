import { useEffect } from 'react'

interface KeyboardControlsOptions {
  onNext?: () => void
  onPrevious?: () => void
  onTogglePlayPause?: () => void
  onExit?: () => void
  onToggleSidebar?: () => void
  onToggleShuffle?: () => void
  onToggleBorder?: () => void
  onToggleFullscreen?: () => void
  disabled?: boolean
}

export function useKeyboardControls({
  onNext,
  onPrevious,
  onTogglePlayPause,
  onExit,
  onToggleSidebar,
  onToggleShuffle,
  onToggleBorder,
  onToggleFullscreen,
  disabled = false
}: KeyboardControlsOptions) {
  useEffect(() => {
    if (disabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          onNext?.()
          break
        case 'ArrowLeft':
          onPrevious?.()
          break
        case ' ':
          e.preventDefault()
          onTogglePlayPause?.()
          break
        case 'Escape':
          onExit?.()
          break
        case 'i':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onToggleSidebar?.()
          }
          break
        case 's':
        case 'S':
          if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
            e.preventDefault()
            onToggleShuffle?.()
          }
          break
        case 'b':
        case 'B':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onToggleBorder?.()
          }
          break
        case 'f':
        case 'F':
          e.preventDefault()
          onToggleFullscreen?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [
    onNext,
    onPrevious,
    onTogglePlayPause,
    onExit,
    onToggleSidebar,
    onToggleShuffle,
    onToggleBorder,
    onToggleFullscreen,
    disabled
  ])
}