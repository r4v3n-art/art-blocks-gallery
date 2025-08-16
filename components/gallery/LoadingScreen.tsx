
type LoadingProgress = {
  loaded: number
  total: number
  percentage: number
}

interface LoadingScreenProps {
  initializing: boolean
  showDetailedProgress: boolean
  loadingProgress: LoadingProgress
  loadingStartTime: number
  canStartGallery: boolean
  isChromieSquiggle?: boolean
  onStartNow?: () => void
}

export function LoadingScreen({
  initializing,
  showDetailedProgress,
  loadingProgress,
  loadingStartTime,
  canStartGallery,
  isChromieSquiggle = false,
  onStartNow
}: LoadingScreenProps) {
  const calculateETA = (): string => {
    if (loadingProgress.percentage === 0) return ''
    const elapsed = Date.now() - loadingStartTime
    const rate = loadingProgress.percentage / elapsed
    const remaining = (100 - loadingProgress.percentage) / rate
    const etaSeconds = Math.round(remaining / 1000)
    
    if (etaSeconds < 60) return `${etaSeconds}s remaining`
    return `${Math.round(etaSeconds / 60)}m remaining`
  }

  if (!initializing) return null

  return (
    <div className="fixed inset-0 bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-[#2d2d2e] flex items-center justify-center">
      <div className="text-gray-900 dark:text-gray-100 text-center max-w-md">
        <h2 className="text-2xl mb-6 font-light">
          {isChromieSquiggle ? 'Loading Chromie Squiggles' : 'Loading Gallery'}
        </h2>
        
        {showDetailedProgress && loadingProgress.total > 0 ? (
          <div className="space-y-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2">
              <div 
                className="bg-gray-900 dark:bg-gray-100 h-2 transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress.percentage}%` }}
              />
            </div>
            
            <div className="space-y-2 text-sm font-light">
              <div className="flex justify-between">
                <span>Tokens loaded:</span>
                <span className="font-mono">{loadingProgress.loaded.toLocaleString()} / {loadingProgress.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Progress:</span>
                <span>{Math.round(loadingProgress.percentage)}%</span>
              </div>
              {loadingProgress.percentage > 5 && (
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {calculateETA()}
                </div>
              )}
            </div>
            
            {loadingProgress.loaded >= 100 && !canStartGallery && onStartNow && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ready to start with {loadingProgress.loaded} tokens
                </p>
                <button
                  onClick={onStartNow}
                  className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white px-6 py-2 font-light transition-colors"
                >
                  Start Now
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="text-sm font-light text-gray-600 dark:text-gray-400">Preparing gallery...</p>
          </div>
        )}
      </div>
    </div>
  )
}