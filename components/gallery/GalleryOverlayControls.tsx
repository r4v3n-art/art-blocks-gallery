import { Button } from "@/components/ui/button"
import { X, Info, Maximize, Minimize } from 'lucide-react'
import { PlaybackControls } from './PlaybackControls'
import { useEnsOrAddress } from "@/lib/utils"
import { TokenEntry } from "@/lib/ab"

interface NFTMeta {
  tokenId: string
  projectName?: string
  artist?: string
  owner?: string
  invocation?: number
}

interface GalleryOverlayControlsProps {
  showControls: boolean
  currentNFT: NFTMeta | null
  currentIndex: number
  shuffledEntries: TokenEntry[]
  isPlaying: boolean
  isShuffled: boolean
  isSingleItem: boolean
  autoPlay: boolean
  duration: number
  timeRemaining: number
  sidebarCollapsed: boolean
  showInfo: boolean
  isFullscreen: boolean
  onExit: () => void
  onPrevious: () => void
  onNext: () => void
  onTogglePlayPause: () => void
  onToggleShuffle: () => void
  onToggleSidebar: () => void
  onToggleFullscreen: () => void
}

export function GalleryOverlayControls({
  showControls,
  currentNFT,
  currentIndex,
  shuffledEntries,
  isPlaying,
  isShuffled,
  isSingleItem,
  autoPlay,
  duration,
  timeRemaining,
  sidebarCollapsed,
  showInfo,
  isFullscreen,
  onExit,
  onPrevious,
  onNext,
  onTogglePlayPause,
  onToggleShuffle,
  onToggleSidebar,
  onToggleFullscreen
}: GalleryOverlayControlsProps) {
  const ownerDisplayName = useEnsOrAddress(currentNFT?.owner)

  if (showInfo && !sidebarCollapsed) return null

  return (
    <>
      {autoPlay && isPlaying && (
        <div className={`absolute top-0 left-0 w-full h-0.5 bg-input z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ 
              width: `${((duration - timeRemaining) / duration) * 100}%` 
            }}
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className={`absolute top-8 right-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}
        title="Exit gallery"
      >
        <X className="w-5 h-5" />
      </Button>

      <div className={`absolute top-8 left-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}>
        <div className="bg-card/95 backdrop-blur-sm border px-4 py-3 max-w-sm">
          {showInfo && sidebarCollapsed && currentNFT ? (
            <div className="space-y-2">
              <div className="font-light text-lg">
                {currentNFT.projectName}
              </div>
              <div className="font-light text-sm text-muted-foreground">
                {currentNFT.artist}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                #{currentNFT.invocation ?? currentNFT.tokenId}
              </div>
              {currentNFT.owner && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-light">Collected by </span>
                  <a 
                    href={`https://www.artblocks.io/profile/${currentNFT.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline transition-colors"
                  >
                    {ownerDisplayName}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <span className="font-light text-sm">
              {currentIndex + 1} / {shuffledEntries.length}
            </span>
          )}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}>
        <div className="bg-card/95 backdrop-blur-sm border-t p-6">
          <div className="flex items-center justify-center gap-4">
            {!isSingleItem && (
              <PlaybackControls
                isPlaying={isPlaying}
                isShuffled={isShuffled}
                onPrevious={onPrevious}
                onNext={onNext}
                onTogglePlayPause={onTogglePlayPause}
                onToggleShuffle={onToggleShuffle}
              />
            )}

            {showInfo && sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                title="Show sidebar (⌘I)"
              >
                <Info className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>

            {isSingleItem && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onExit}
                title="Exit gallery"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
          {!isSingleItem && (
            <div className="text-center mt-3 space-y-1">
              <div className="text-sm font-light text-muted-foreground">
                Slide {currentIndex + 1} of {shuffledEntries.length}
              </div>
              {autoPlay && (
                <div className="text-sm font-light text-muted-foreground">
                  {isPlaying ? `Next in ${timeRemaining}s` : 'Paused'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}