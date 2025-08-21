"use client"

interface GridLoadingStateProps {
  isInitialLoading: boolean
  thumbnailsLoaded: boolean
  loadingProgress: {
    loaded: number
    total: number
    percentage: number
  }
  tokenCount: number
  projectName?: string
}

export function GridLoadingState({ 
  isInitialLoading,
  thumbnailsLoaded,
  loadingProgress,
  tokenCount,
  projectName
}: GridLoadingStateProps) {
  // Initial data loading
  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-light">Loading Collection</h2>
            {projectName && (
              <p className="text-gray-600">{projectName}</p>
            )}
            <p className="text-sm text-gray-500">
              Fetching token data...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Thumbnail loading phase
  if (!thumbnailsLoaded && tokenCount > 0) {
    const { loaded, total, percentage } = loadingProgress
    
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          {/* Spinner */}
          <div className="w-20 h-20 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          
          {/* Title and project info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-light">Loading {tokenCount.toLocaleString()} Tokens</h2>
            {projectName && (
              <p className="text-lg text-gray-600 font-light">{projectName}</p>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            
            {/* Progress text */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{loaded.toLocaleString()} of {total.toLocaleString()} loaded</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Status message */}
          <p className="text-sm text-gray-500">
            Loading thumbnail images...
          </p>
          
          {/* Estimated time remaining */}
          {percentage > 10 && (
            <p className="text-xs text-gray-400">
              Grid will appear when thumbnails finish loading
            </p>
          )}
        </div>
      </div>
    )
  }

  // No loading state needed
  return null
}

interface ProgressiveLoadingIndicatorProps {
  isProgressiveLoading: boolean
  className?: string
}

export function ProgressiveLoadingIndicator({ 
  isProgressiveLoading, 
  className = "" 
}: ProgressiveLoadingIndicatorProps) {
  if (!isProgressiveLoading) return null

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      <span>Loading high-resolution images in background...</span>
    </div>
  )
}
