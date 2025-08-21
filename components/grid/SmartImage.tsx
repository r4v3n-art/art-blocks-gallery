"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TokenEntry } from "@/lib/ab"
import { composeMediaUrl, composeImageSrcSet, generateImageSizes } from "@/lib/imageUtils"

interface SmartImageProps {
  token: TokenEntry
  displaySize: number
  isVisible: boolean
  onLoad: () => void
  onError: () => void
  onThumbnailLoad?: () => void
  isZooming?: boolean
  className?: string
}

export function SmartImage({ 
  token, 
  displaySize, 
  isVisible, 
  onLoad, 
  onError, 
  onThumbnailLoad,
  isZooming = false,
  className = ""
}: SmartImageProps) {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [retryTimeoutId, setRetryTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const MAX_RETRIES = 3
  
  const imgRef = useRef<HTMLImageElement>(null)
  const isEngine = !!token.contractAddress

  // Load thumbnail first for progressive enhancement
  useEffect(() => {
    if (!isVisible || thumbnailLoaded) return

    const loadThumbnail = async (retriesLeft: number = MAX_RETRIES): Promise<void> => {
      try {
        // For engine contracts, skip thumbnail as they only have standard size
        if (isEngine) {
          setThumbnailLoaded(true)
          setIsLoading(false)
          if (onThumbnailLoad) onThumbnailLoad()
          onLoad()
          return
        }

        const thumbnailUrl = composeMediaUrl(token.tokenId, token.contractAddress, 'thumbnail', token.projectId)
        
        // Add cache-busting query param only for retries
        const finalUrl = retryCount > 0 ? `${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}retry=${retryCount}` : thumbnailUrl
        
        // Preload the thumbnail
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = finalUrl
        })
        
        setThumbnailLoaded(true)
        setIsLoading(false)
        setRetryCount(0)
        
        if (onThumbnailLoad) onThumbnailLoad()
        onLoad()
        
      } catch (error) {
        console.log(`Failed to load thumbnail for token ${token.tokenId}, retries left: ${retriesLeft}`)
        
        if (retriesLeft > 0) {
          // Exponential backoff
          const delay = (MAX_RETRIES - retriesLeft + 1) * 500
          const timeoutId = setTimeout(() => {
            setRetryCount(prev => prev + 1)
            loadThumbnail(retriesLeft - 1)
          }, delay)
          setRetryTimeoutId(timeoutId)
        } else {
          // Thumbnail failed, proceed anyway - srcset will handle it
          console.log(`Thumbnail failed for token ${token.tokenId}, proceeding with srcset`)
          setThumbnailLoaded(true)
          setIsLoading(false)
          onLoad()
        }
      }
    }

    loadThumbnail()
  }, [isVisible, thumbnailLoaded, token, isEngine, onLoad, onThumbnailLoad, retryCount])
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId)
      }
    }
  }, [retryTimeoutId])

  // Handle image load event from img element
  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    if (!thumbnailLoaded) {
      setThumbnailLoaded(true)
      if (onThumbnailLoad) onThumbnailLoad()
    }
    onLoad()
  }, [onLoad, onThumbnailLoad, thumbnailLoaded])

  // Handle image error from img element
  const handleImageError = useCallback(() => {
    console.log(`Image element error for token ${token.tokenId}`)
    setHasError(true)
    setIsLoading(false)
    onError()
  }, [token.tokenId, onError])

  // Generate image URLs
  const srcSet = composeImageSrcSet(token.tokenId, token.contractAddress, token.projectId)
  const sizes = generateImageSizes(displaySize)
  
  // Default src for initial load (thumbnail for flagship, standard for engine)
  const defaultSrc = token.imageUrl || composeMediaUrl(
    token.tokenId, 
    token.contractAddress, 
    isEngine ? 'standard' : 'thumbnail', 
    token.projectId
  )

  return (
    <div className={`relative bg-white ${className}`} style={{ width: '100%', height: '100%' }}>
      {/* Always have white background as fallback */}
      {!hasError && (
        <img
          ref={imgRef}
          src={defaultSrc}
          srcSet={isEngine ? undefined : srcSet}
          sizes={isEngine ? undefined : sizes}
          alt=""
          crossOrigin="anonymous"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transform-gpu ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            willChange: isZooming ? 'transform' : 'auto',
            contain: 'layout style paint'
          }}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-xs text-gray-400">Failed to load</span>
        </div>
      )}
    </div>
  )
}