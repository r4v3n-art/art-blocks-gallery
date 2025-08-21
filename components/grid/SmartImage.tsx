"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TokenEntry } from "@/lib/ab"
import { composeMediaUrl, getOptimalImageSize, type ImageSize } from "@/lib/imageUtils"

// Global image cache to store loaded images across components
const imageCache = new Map<string, HTMLImageElement>()

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
  const [currentSize, setCurrentSize] = useState<ImageSize>('thumbnail')
  const [loadedSizes, setLoadedSizes] = useState<Set<ImageSize>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [retryTimeoutId, setRetryTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const MAX_RETRIES = 3
  
  const imgRef = useRef<HTMLImageElement>(null)
  const isEngine = !!token.contractAddress

  // Determine optimal size based on display dimensions
  // For larger cells or when zoomed, use HD for best quality
  const optimalSize = getOptimalImageSize(displaySize)
  const targetSize = isEngine ? 'standard' : optimalSize

  // Progressive loading effect
  useEffect(() => {
    if (!isVisible || isZooming) return // Don't load new sizes while zooming

    const loadImageSize = async (size: ImageSize, retriesLeft: number = MAX_RETRIES): Promise<void> => {
      try {
        const url = token.imageUrl || composeMediaUrl(token.tokenId, token.contractAddress, size, token.projectId)
        const cacheKey = `${token.tokenId}-${size}`
        
        // Check if image is already in cache
        if (imageCache.has(cacheKey)) {
          const cachedImg = imageCache.get(cacheKey)!
          if (cachedImg.complete && cachedImg.naturalWidth > 0) {
            // Image is cached and valid
            setLoadedSizes(prev => new Set(prev).add(size))
            setCurrentSize(size)
            setIsLoading(false)
            setRetryCount(0)
            
            if (size === 'thumbnail' && onThumbnailLoad) {
              onThumbnailLoad()
            }
            onLoad()
            return
          }
        }
        
        // Add cache-busting query param only for retries
        const finalUrl = retryCount > 0 ? `${url}${url.includes('?') ? '&' : '?'}retry=${retryCount}` : url
        
        // Preload the image with caching headers
        const img = new Image()
        img.crossOrigin = 'anonymous' // Enable CORS for caching
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Store in cache on successful load
            imageCache.set(cacheKey, img)
            resolve(img)
          }
          img.onerror = reject
          img.src = finalUrl
        })
        
        setLoadedSizes(prev => new Set(prev).add(size))
        setCurrentSize(size)
        setIsLoading(false)
        setRetryCount(0) // Reset retry count on success
        
        // Notify parent of successful load
        if (size === 'thumbnail' && onThumbnailLoad) {
          onThumbnailLoad()
        }
        onLoad()
        
      } catch (error) {
        console.log(`Failed to load ${size} for token ${token.tokenId}, retries left: ${retriesLeft}`)
        
        // If thumbnail fails on first try, immediately try standard/HD
        if (size === 'thumbnail' && retriesLeft === MAX_RETRIES) {
          console.log(`Thumbnail failed for token ${token.tokenId}, trying fallback`)
          // Mark thumbnail as "loaded" to prevent retrying it
          setLoadedSizes(prev => new Set(prev).add('thumbnail'))
          // Try standard or HD based on target
          const fallbackSize = targetSize === 'hd' ? 'hd' : 'standard'
          await loadImageSize(fallbackSize, MAX_RETRIES)
          return
        }
        
        if (retriesLeft > 0) {
          // Exponential backoff: wait longer between retries
          const delay = (MAX_RETRIES - retriesLeft + 1) * 500 // Reduced delays
          const timeoutId = setTimeout(() => {
            setRetryCount(prev => prev + 1)
            loadImageSize(size, retriesLeft - 1)
          }, delay)
          setRetryTimeoutId(timeoutId)
        } else {
          // All retries exhausted, try different sizes
          if (size === 'hd') {
            // HD failed, try standard
            console.log(`HD failed for token ${token.tokenId}, trying standard`)
            await loadImageSize('standard', MAX_RETRIES)
          } else if (size === 'standard' && targetSize === 'hd') {
            // Standard failed when HD was target, try HD
            console.log(`Standard failed for token ${token.tokenId}, trying HD`)
            await loadImageSize('hd', MAX_RETRIES)
          } else {
            // Keep retrying periodically forever - never give up
            console.log(`All attempts failed for token ${token.tokenId}, will retry in 5s`)
            const timeoutId = setTimeout(() => {
              setRetryCount(0)
              setHasError(false) // Reset error state
              setIsLoading(true) // Show loading state again
              loadImageSize(size, MAX_RETRIES)
            }, 5000) // Retry every 5 seconds
            setRetryTimeoutId(timeoutId)
            
            // Don't set permanent error - show loading instead
            setIsLoading(true)
          }
        }
      }
    }

    // Progressive loading strategy:
    // 1. Try thumbnail first (but will fall back to standard/HD if it fails)
    // 2. Then load target size based on display size
    
    const hasAnySize = loadedSizes.has('thumbnail') || loadedSizes.has('standard') || loadedSizes.has('hd')
    
    if (!hasAnySize && !isEngine) {
      // No images loaded yet, start with thumbnail
      loadImageSize('thumbnail').then(() => {
        // After thumbnail (or fallback) loads, load target size if different
        if (!loadedSizes.has(targetSize)) {
          // Small delay to prioritize other thumbnails loading first
          setTimeout(() => loadImageSize(targetSize), 100)
        }
      })
    } else if (!loadedSizes.has(targetSize)) {
      // Some size already loaded, load target size if needed
      loadImageSize(targetSize)
    } else {
      // Target size already loaded, just switch to it
      setCurrentSize(targetSize)
    }
  }, [isVisible, isZooming, targetSize, loadedSizes, token, isEngine, onLoad, onError, onThumbnailLoad])
  
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
    onLoad()
  }, [onLoad, token.tokenId])

  // Handle image error from img element - don't set permanent error
  const handleImageError = useCallback(() => {
    // Don't set hasError to true - keep showing loading state
    console.log(`Image element error for token ${token.tokenId}, will rely on retry logic`)
    // Keep loading state true so we show white placeholder
    setIsLoading(true)
  }, [token.tokenId])

  const imageUrl = token.imageUrl || composeMediaUrl(token.tokenId, token.contractAddress, currentSize, token.projectId)

  return (
    <div className={`relative bg-white ${className}`} style={{ width: '100%', height: '100%' }}>
      {/* Always have white background as fallback */}
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
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
    </div>
  )
}
