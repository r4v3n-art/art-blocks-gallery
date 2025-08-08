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
        className="text-gray-900 hover:bg-gray-200"
      >
        <SkipBack className="w-5 h-5" />
      </Button>
    
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePlayPause}
        disabled={disabled}
        className="text-gray-900 hover:bg-gray-200"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>
    
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={disabled}
        className="text-gray-900 hover:bg-gray-200"
      >
        <SkipForward className="w-5 h-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleShuffle}
        disabled={disabled}
        className={`${isShuffled ? 'text-gray-900 bg-gray-200' : 'text-gray-900'} hover:bg-gray-200 ml-2`}
        title={isShuffled ? "Shuffle is on" : "Shuffle is off"}
      >
        <Shuffle className="w-5 h-5" />
      </Button>
    </div>
  )
}