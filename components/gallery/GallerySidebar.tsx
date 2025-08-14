import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ChevronLeft } from 'lucide-react'
import { PlaybackControls } from './PlaybackControls'
import { useEnsOrAddress } from "@/lib/utils"
import { TokenEntry } from "@/lib/ab"
import { ThemeToggle } from "@/components/ThemeToggle"

interface NFTMeta {
  tokenId: string
  projectName?: string
  artist?: string
  contractAddress?: string
  generatorUrl: string
  imageUrl?: string
  owner?: string
  invocation?: number
  projectId?: string
  projectWebsite?: string
  artistAddress?: string
  projectSlug?: string
}

interface GallerySidebarProps {
  currentNFT: NFTMeta | null
  currentIndex: number
  shuffledEntries: TokenEntry[]
  totalTokenCount?: number // Total expected tokens for large collections
  isLoadingComplete: boolean
  loadingProgress: { loaded: number; total: number; percentage: number }
  isSingleItem: boolean
  autoPlay: boolean
  isPlaying: boolean
  isShuffled: boolean
  timeRemaining: number
  duration: number
  durationSliderValue: number
  onExit: () => void
  onToggleSidebar: () => void
  onPrevious: () => void
  onNext: () => void
  onTogglePlayPause: () => void
  onToggleShuffle: () => void
  onDurationChange: (value: number) => void
}

const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

function getArtistUrl(artistAddress?: string) {
  return artistAddress ? `https://www.artblocks.io/artists/${artistAddress}` : null
}

function getProjectUrl(projectSlug?: string) {
  return projectSlug ? `https://www.artblocks.io/collection/${projectSlug}` : null
}

export function GallerySidebar({
  currentNFT,
  currentIndex,
  shuffledEntries,
  totalTokenCount,
  // isLoadingComplete, // Not used with just-in-time loading
  // loadingProgress, // Not used with just-in-time loading
  isSingleItem,
  autoPlay,
  isPlaying,
  isShuffled,
  timeRemaining,
  duration,
  durationSliderValue,
  onExit,
  onToggleSidebar,
  onPrevious,
  onNext,
  onTogglePlayPause,
  onToggleShuffle,
  onDurationChange
}: GallerySidebarProps) {
  const ownerDisplayName = useEnsOrAddress(currentNFT?.owner)

  return (
    <div className="w-80 bg-card border-r flex flex-col">
      <div className="p-6 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="font-light"
        >
          ← Exit Gallery
        </Button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            title="Hide sidebar (⌘I)"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 flex-1">
        <div className="space-y-6">
          {currentNFT && (
            <>
              <div>
                <h2 className="text-2xl font-light mb-2">
                  {currentNFT.projectName}
                </h2>
                <p className="font-light text-lg mb-4 text-muted-foreground">
                  {currentNFT.artist}
                </p>
                <div className="space-y-2">
                  <div className="text-sm font-mono text-muted-foreground">
                    #{currentNFT.invocation ?? currentNFT.tokenId}
                  </div>
                  {currentNFT.owner && (
                    <div className="text-sm text-muted-foreground">
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
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2 text-xs">
                  {getProjectUrl(currentNFT.projectSlug) && (
                    <div>
                      <a 
                        href={getProjectUrl(currentNFT.projectSlug)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                      >
                        View Collection
                      </a>
                    </div>
                  )}
                  {getArtistUrl(currentNFT.artistAddress) && (
                    <div>
                      <a 
                        href={getArtistUrl(currentNFT.artistAddress)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                      >
                        View Artist
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!isSingleItem && (
            <div className="pt-4 border-t">
              <div className="text-sm font-light text-muted-foreground">
                Slide {currentIndex + 1} of {totalTokenCount || shuffledEntries.length}
              </div>
            </div>
          )}

          {!isSingleItem && autoPlay && (
            <div className="pt-4 border-t">
              <div className="text-sm font-light text-muted-foreground mb-3">
                Duration: {formatDuration(duration)}
              </div>
              <Slider
                value={[durationSliderValue]}
                onValueChange={(value) => onDurationChange(value[0])}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5s</span>
                <span>7d</span>
              </div>
            </div>
          )}

          {!isSingleItem && autoPlay && (
            <div className="pt-4 border-t">
              <div className="text-sm font-light text-muted-foreground mb-2">
                {isPlaying ? `Next in ${timeRemaining}s` : 'Paused'}
              </div>
              <div className="w-full bg-input h-1">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${((duration - timeRemaining) / duration) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="text-sm font-light mb-3">Controls</h3>
            <div className="space-y-2 text-xs">
              {!isSingleItem && (
                <>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Next</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">→</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Previous</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">←</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Play/Pause</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Toggle Shuffle</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">{isMac ? '⌘⇧S' : 'Ctrl+Shift+S'}</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Toggle Border</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">{isMac ? '⌘B' : 'Ctrl+B'}</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-muted-foreground">Fullscreen</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">F</kbd>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="font-light text-muted-foreground">Toggle Info</span>
                <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">{isMac ? '⌘I' : 'Ctrl+I'}</kbd>
              </div>
              <div className="flex justify-between">
                <span className="font-light text-muted-foreground">Toggle Theme</span>
                <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="font-light text-muted-foreground">Exit</span>
                <kbd className="px-2 py-1 bg-muted text-muted-foreground font-mono">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isSingleItem && (
        <div className="p-6 border-t">
          <PlaybackControls
            isPlaying={isPlaying}
            isShuffled={isShuffled}
            onPrevious={onPrevious}
            onNext={onNext}
            onTogglePlayPause={onTogglePlayPause}
            onToggleShuffle={onToggleShuffle}
          />
        </div>
      )}
    </div>
  )
}