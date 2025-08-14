import { Button } from "@/components/ui/button"
import { Play, Pause, SkipForward, SkipBack, Shuffle } from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  isShuffled: boolean
  onPrevious: () => void
  onNext: () => void
  onTogglePlayPause: () => void
  onToggleShuffle: () => void
  disabled?: boolean
}

export function PlaybackControls({
  isPlaying,
  isShuffled,
  onPrevious,
  onNext,
  onTogglePlayPause,
  onToggleShuffle,
  disabled = false
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={disabled}
      >
        <SkipBack className="w-5 h-5" />
      </Button>
    
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePlayPause}
        disabled={disabled}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>
    
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={disabled}
      >
        <SkipForward className="w-5 h-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleShuffle}
        disabled={disabled}
        className={isShuffled ? 'bg-accent text-accent-foreground' : undefined}
        title={isShuffled ? "Shuffle is on" : "Shuffle is off"}
      >
        <Shuffle className="w-5 h-5" />
      </Button>
    </div>
  )
}