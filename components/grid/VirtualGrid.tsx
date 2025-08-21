"use client"

import { useRef } from "react"
import type { TokenEntry } from "@/lib/ab"
import { useVirtualGrid } from "@/hooks/useVirtualGrid"
import { GridCell } from "./GridCell"

interface VirtualGridProps {
  tokens: TokenEntry[]
  cellSize: number
  displaySize?: number
  onImageLoad: (index: number) => void
  onImageError: (index: number) => void
  onThumbnailLoad: (index: number) => void
  isZooming?: boolean
  className?: string
}

export function VirtualGrid({
  tokens,
  cellSize,
  displaySize,
  onImageLoad,
  onImageError,
  onThumbnailLoad,
  isZooming = false,
  className = ""
}: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    isItemVisible,
    getGridMetrics
  } = useVirtualGrid(tokens.length, cellSize, containerRef)

  const { gridHeight } = getGridMetrics()

  const gap = 10 // Fixed 10px gap for consistent spacing
  
  return (
    <div className={`w-full ${className}`}>
      <div
        ref={containerRef}
        className="will-change-transform"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, ${cellSize}px))`,
          gap: `${gap}px`,
          padding: `${gap}px`,
          width: '100%',
          justifyContent: 'center',
          transform: 'translateZ(0)', // Force GPU acceleration
          backfaceVisibility: 'hidden'
        }}
      >
        {tokens.map((token, index) => {
          const isVisible = isItemVisible(index)
          
          return (
            <GridCell
              key={token.tokenId}
              token={token}
              cellSize={cellSize}
              displaySize={displaySize || cellSize}
              index={index}
              isVisible={isVisible}
              onImageLoad={onImageLoad}
              onImageError={onImageError}
              onThumbnailLoad={onThumbnailLoad}
              isZooming={isZooming}
            />
          )
        })}
      </div>
    </div>
  )
}

interface GridPlaceholderProps {
  tokenCount: number
  cellSize: number
  className?: string
}

export function GridPlaceholder({ 
  tokenCount, 
  cellSize, 
  className = "" 
}: GridPlaceholderProps) {
  const placeholders = Array.from({ length: Math.min(tokenCount, 100) }, (_, i) => i)
  
  return (
    <div className={`p-4 ${className}`}>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`
        }}
      >
        {placeholders.map((index) => (
          <div
            key={index}
            className="bg-gray-100 animate-pulse rounded"
            style={{ width: cellSize, height: cellSize }}
          />
        ))}
      </div>
    </div>
  )
}
