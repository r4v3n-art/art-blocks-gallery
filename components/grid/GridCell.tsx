"use client"

import { useCallback } from "react"
import type { TokenEntry } from "@/lib/ab"
import { SmartImage } from "./SmartImage"

interface GridCellProps {
  token: TokenEntry
  cellSize: number
  displaySize?: number
  index: number
  isVisible: boolean
  onImageLoad: (index: number) => void
  onImageError: (index: number) => void
  onThumbnailLoad?: (index: number) => void
  isZooming?: boolean
  className?: string
}

export function GridCell({ 
  token, 
  cellSize,
  displaySize,
  index, 
  isVisible, 
  onImageLoad, 
  onImageError,
  onThumbnailLoad,
  isZooming = false,
  className = ""
}: GridCellProps) {

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    onImageLoad(index)
  }, [index, onImageLoad])

  // Handle image load error
  const handleImageError = useCallback(() => {
    onImageError(index)
  }, [index, onImageError])

  // Handle thumbnail load specifically
  const handleThumbnailLoad = useCallback(() => {
    if (onThumbnailLoad) {
      onThumbnailLoad(index)
    }
  }, [index, onThumbnailLoad])

  return (
    <div 
      className={`grid-cell relative ${className}`}
      style={{ 
        width: cellSize, 
        height: cellSize,
        position: 'relative',
        overflow: 'hidden'
      }}
      data-index={index}
    >
      {isVisible ? (
        <SmartImage
          token={token}
          displaySize={displaySize || cellSize}
          isVisible={true}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onThumbnailLoad={handleThumbnailLoad}
          isZooming={isZooming}
          className="absolute inset-0 w-full h-full grid-image"
        />
      ) : (
        // Placeholder for virtualized cells - white instead of gray
        <div 
          className="absolute inset-0 w-full h-full bg-white"
          data-index={index}
        />
      )}
    </div>
  )
}