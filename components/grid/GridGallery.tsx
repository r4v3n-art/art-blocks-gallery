"use client"

import { useState, useMemo, useCallback, useEffect, useRef, CSSProperties } from "react"
import { FixedSizeGrid as Grid } from "react-window"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { useGridData } from "@/hooks/useGridData"
import { useImageLoading } from "@/hooks/useImageLoading"
import { GridLoadingState } from "./GridLoadingState"
import { GridCell } from "./GridCell"
import type { TokenEntry } from "@/lib/ab"

interface GridGalleryProps {
  slug: string
  columns?: number
  rows?: number
}

// Cell renderer for react-window
const Cell = ({ columnIndex, rowIndex, style, data }: {
  columnIndex: number
  rowIndex: number
  style: CSSProperties
  data: {
    tokens: TokenEntry[]
    columnCount: number
    onImageLoad: (index: number) => void
    onImageError: (index: number) => void
    onThumbnailLoad: (index: number) => void
    cellSize: number
    isZooming: boolean
  }
}) => {
  const { tokens, columnCount, onImageLoad, onImageError, onThumbnailLoad, cellSize, isZooming } = data
  const index = rowIndex * columnCount + columnIndex
  const token = tokens[index]
  
  if (!token) return <div style={style} />
  
  return (
    <div style={style}>
      <GridCell
        token={token}
        cellSize={cellSize - 10} // Account for gap
        displaySize={cellSize - 10}
        index={index}
        isVisible={true}
        onImageLoad={onImageLoad}
        onImageError={onImageError}
        onThumbnailLoad={onThumbnailLoad}
        isZooming={isZooming}
      />
    </div>
  )
}

export function GridGallery({ slug, columns = 10, rows = 10 }: GridGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<Grid>(null)
  const [mounted, setMounted] = useState(false)
  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  })
  const [isZooming, setIsZooming] = useState(false)
  const [currentScale, setCurrentScale] = useState(1)
  
  // Calculate total items needed based on columns and rows
  const totalItemsNeeded = columns * rows
  
  // Load token data with the specified number of items
  const { 
    tokens, 
    loading: dataLoading, 
    error: dataError, 
    progress: dataProgress,
    projectName,
    artistName
  } = useGridData(slug, totalItemsNeeded)

  // Track image loading state
  const {
    handleImageLoad,
    handleImageError,
    handleThumbnailLoad,
    reset: resetImageLoading
  } = useImageLoading(tokens.length)

  // Reset image loading when tokens change
  useEffect(() => {
    resetImageLoading()
  }, [tokens.length, resetImageLoading])

  // Set mounted state on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fixed cell size for consistent appearance
  const cellSize = 120 // Fixed size for each cell
  
  // Use the columns parameter for column count
  const columnCount = columns

  // Use the rows parameter for row count
  const rowCount = rows
  
  // Calculate initial scale to fit all content in viewport with margins
  const initialScale = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return 1
    
    const gridWidth = columnCount * cellSize
    const gridHeight = rowCount * cellSize
    
    // Calculate scale needed to fit width and height with 10% margins
    // 80% of viewport (100% - 10% left - 10% right)
    const scaleX = (dimensions.width * 0.8) / gridWidth
    const scaleY = (dimensions.height * 0.8) / gridHeight
    
    // Use the smaller scale to ensure everything fits
    const fitScale = Math.min(scaleX, scaleY)
    
    // Ensure minimum scale
    return Math.max(fitScale, 0.1)
  }, [dimensions.width, dimensions.height, rowCount, cellSize, columnCount])
  
  // Calculate initial position to center the grid
  const { initialX, initialY } = useMemo(() => {
    const gridWidth = columnCount * cellSize
    const gridHeight = rowCount * cellSize
    
    // Calculate the scaled dimensions
    const scaledWidth = gridWidth * initialScale
    const scaledHeight = gridHeight * initialScale
    
    // Center the grid with equal margins
    const x = (dimensions.width - scaledWidth) / 2
    const y = (dimensions.height - scaledHeight) / 2
    
    return { initialX: x, initialY: y }
  }, [dimensions.width, dimensions.height, rowCount, cellSize, columnCount, initialScale])
  
  // Track visible items for priority loading
  const [visibleRange, setVisibleRange] = useState({ startRow: 0, endRow: 10, startCol: 0, endCol: 10 })

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth
        const newHeight = containerRef.current.clientHeight
        setDimensions({
          width: newWidth,
          height: newHeight
        })
      }
    }

    // Use a small timeout to ensure the container is mounted
    setTimeout(updateDimensions, 0)
    
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Handle zoom state changes - throttle updates for better performance
  const handleTransform = useCallback((e: any) => {
    // Only update scale if it changed significantly (reduces re-renders)
    if (Math.abs(e.state.scale - currentScale) > 0.01) {
      setCurrentScale(e.state.scale)
    }
    // Don't set isZooming on every transform to reduce re-renders
    if (!isZooming) {
      setIsZooming(true)
    }
  }, [currentScale, isZooming])
  
  const handleTransformEnd = useCallback(() => {
    // Reduced delay for quicker response
    setTimeout(() => setIsZooming(false), 100)
  }, [])
  
  // Prevent browser zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Prevent browser zoom with Ctrl/Cmd + wheel
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser zoom with Ctrl/Cmd + plus/minus/0
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0' || e.key === '=')) {
        e.preventDefault()
      }
    }
    
    const handleGestureStart = (e: Event) => {
      e.preventDefault()
    }
    
    const handleGestureChange = (e: Event) => {
      e.preventDefault()
    }
    
    const handleGestureEnd = (e: Event) => {
      e.preventDefault()
    }
    
    // Add listeners to window to catch all events
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    
    // Prevent Safari pinch zoom
    document.addEventListener('gesturestart', handleGestureStart, { passive: false })
    document.addEventListener('gesturechange', handleGestureChange, { passive: false })
    document.addEventListener('gestureend', handleGestureEnd, { passive: false })
    
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('gesturestart', handleGestureStart)
      document.removeEventListener('gesturechange', handleGestureChange)
      document.removeEventListener('gestureend', handleGestureEnd)
    }
  }, [])

  // Handle thumbnail load events
  const handleThumbnailLoadEvent = useCallback((index: number) => {
    handleThumbnailLoad()
    handleImageLoad(index)
  }, [handleThumbnailLoad, handleImageLoad])

  // Error handling
  if (dataError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light text-red-600">Error Loading Collection</h2>
          <p className="text-gray-600">{dataError}</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (dataLoading) {
    return (
      <GridLoadingState
        isInitialLoading={true}
        thumbnailsLoaded={false}
        loadingProgress={dataProgress}
        tokenCount={tokens.length}
        projectName={projectName}
      />
    )
  }

  // No tokens found
  if (tokens.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light">No Tokens Found</h2>
          <p className="text-gray-600">This project doesn't appear to have any minted tokens yet.</p>
        </div>
      </div>
    )
  }

  const itemData = {
    tokens,
    columnCount,
    onImageLoad: handleImageLoad,
    onImageError: handleImageError,
    onThumbnailLoad: handleThumbnailLoadEvent,
    cellSize,
    isZooming
  }

  return (
    <div ref={containerRef} className={`bg-white relative grid-container ${isZooming ? 'grid-zooming' : ''}`} style={{ height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'visible' }}>
      {mounted && dimensions.width > 0 && dimensions.height > 0 && (
        <TransformWrapper
          key={`${slug}-${tokens.length}`} // Only re-mount when slug or token count changes
          initialScale={initialScale}
          initialPositionX={initialX}
          initialPositionY={initialY}
          minScale={initialScale}
          maxScale={20}
          centerOnInit={false}  // We're manually centering with initialPosition
          limitToBounds={false}
          wheel={{ 
            disabled: false,
            step: 0.05,  // Much less sensitive for both mouse wheel and trackpad
            smoothStep: 0.05,  // Increased for smoother animation
            touchPadDisabled: false,
            activationKeys: []  // Allow wheel zoom without modifier keys
          }}
          pinch={{ 
            disabled: false,
            step: 2  // Reduced mobile pinch sensitivity for more control
          }}
          panning={{
            disabled: false,
            velocityDisabled: false
          }}
          doubleClick={{ 
            disabled: false,
            step: 0.5,
            mode: "zoomIn"
          }}
          // @ts-expect-error - onTransforming works in this version but types are outdated
          onTransforming={handleTransform}
          onPanningStop={handleTransformEnd}
          onZoomStop={handleTransformEnd}
        >
          <TransformComponent>
            <div style={{ 
              width: columnCount * cellSize, 
              height: rowCount * cellSize
            }}>
              <Grid
                ref={gridRef}
                className="scrollbar-thin grid-scroll"
                columnCount={columnCount}
                columnWidth={cellSize}
                height={rowCount * cellSize}
                rowCount={rowCount}
                rowHeight={cellSize}
                width={columnCount * cellSize}
                itemData={itemData}
                overscanRowCount={2}
                overscanColumnCount={2}
                onItemsRendered={({ visibleRowStartIndex, visibleRowStopIndex, visibleColumnStartIndex, visibleColumnStopIndex }: {
                  visibleRowStartIndex: number
                  visibleRowStopIndex: number
                  visibleColumnStartIndex: number
                  visibleColumnStopIndex: number
                }) => {
                  setVisibleRange({
                    startRow: visibleRowStartIndex,
                    endRow: visibleRowStopIndex,
                    startCol: visibleColumnStartIndex,
                    endCol: visibleColumnStopIndex
                  })
                }}
              >
                {Cell}
              </Grid>
            </div>
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  )
}