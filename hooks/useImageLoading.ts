import { useState, useCallback, useRef, useEffect } from "react"

interface ImageLoadingState {
  loadedImages: Set<number>
  failedImages: Set<number>
  thumbnailsLoaded: boolean
  progressiveLoadingComplete: boolean
}

export function useImageLoading(totalImages: number) {
  const [state, setState] = useState<ImageLoadingState>({
    loadedImages: new Set(),
    failedImages: new Set(),
    thumbnailsLoaded: false,
    progressiveLoadingComplete: false
  })

  const thumbnailCountRef = useRef(0)

  // Reset state when totalImages changes
  useEffect(() => {
    console.log(`🔄 useImageLoading reset: totalImages changed to ${totalImages}`)
    setState({
      loadedImages: new Set(),
      failedImages: new Set(),
      thumbnailsLoaded: false,
      progressiveLoadingComplete: false
    })
    thumbnailCountRef.current = 0
  }, [totalImages])

  const handleImageLoad = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      loadedImages: new Set(prev.loadedImages).add(index)
    }))
  }, [])

  const handleImageError = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      failedImages: new Set(prev.failedImages).add(index)
    }))
  }, [])

  const handleThumbnailLoad = useCallback(() => {
    thumbnailCountRef.current += 1
    console.log(`📸 Thumbnail loaded: ${thumbnailCountRef.current}/${totalImages}`)
    
    if (thumbnailCountRef.current >= totalImages) {
      console.log(`✅ All thumbnails loaded!`)
      setState(prev => ({
        ...prev,
        thumbnailsLoaded: true
      }))
    }
  }, [totalImages])

  const setProgressiveLoadingComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      progressiveLoadingComplete: true
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      loadedImages: new Set(),
      failedImages: new Set(),
      thumbnailsLoaded: false,
      progressiveLoadingComplete: false
    })
    thumbnailCountRef.current = 0
  }, [])

  return {
    ...state,
    handleImageLoad,
    handleImageError,
    handleThumbnailLoad,
    setProgressiveLoadingComplete,
    reset,
    loadingProgress: {
      loaded: state.loadedImages.size,
      total: totalImages,
      percentage: totalImages > 0 ? (state.loadedImages.size / totalImages) * 100 : 0
    }
  }
}
