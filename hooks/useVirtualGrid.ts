import { useState, useEffect, useCallback, useRef } from "react"

interface VirtualGridState {
  visibleRange: { start: number; end: number }
  gridColumns: number
  containerWidth: number
}

export function useVirtualGrid(
  totalItems: number,
  cellSize: number,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [state, setState] = useState<VirtualGridState>({
    visibleRange: { start: 0, end: 200 }, // Increased initial range
    gridColumns: 6,
    containerWidth: 0
  })

  // Calculate grid columns based on container width
  const updateGridDimensions = useCallback(() => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.clientWidth
    const gap = 8 // CSS gap
    const padding = 32 // Container padding
    const availableWidth = containerWidth - padding
    const columns = Math.max(1, Math.floor(availableWidth / (cellSize + gap)))

    setState(prev => ({
      ...prev,
      gridColumns: columns,
      containerWidth
    }))
  }, [cellSize, containerRef])

  // Set up intersection observer for virtualization
  const setupVirtualization = useCallback(() => {
    if (!containerRef.current || totalItems === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleElements = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => {
            const index = entry.target.getAttribute('data-index')
            return index ? parseInt(index, 10) : 0
          })
          .filter(index => !isNaN(index))

        if (visibleElements.length > 0) {
          const buffer = 50 // Extra items to render outside viewport
          const start = Math.max(0, Math.min(...visibleElements) - buffer)
          const end = Math.min(totalItems, Math.max(...visibleElements) + buffer)
          
          setState(prev => ({
            ...prev,
            visibleRange: { start, end }
          }))
        }
      },
      { 
        root: containerRef.current,
        rootMargin: '200px',
        threshold: 0
      }
    )

    // Observe all grid items
    const cells = containerRef.current.querySelectorAll('[data-index]')
    cells.forEach(cell => observer.observe(cell))

    return () => observer.disconnect()
  }, [totalItems, containerRef])

  // Update dimensions on mount and resize
  useEffect(() => {
    updateGridDimensions()

    const resizeObserver = new ResizeObserver(updateGridDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [updateGridDimensions])

  // Set up virtualization when items change
  useEffect(() => {
    const cleanup = setupVirtualization()
    return cleanup
  }, [setupVirtualization])

  const isItemVisible = useCallback((index: number) => {
    // Use virtualization to only render visible items
    return index >= state.visibleRange.start && index <= state.visibleRange.end
  }, [state.visibleRange])

  const getGridMetrics = useCallback(() => {
    const totalRows = Math.ceil(totalItems / state.gridColumns)
    const gridHeight = totalRows * (cellSize + 8) + 32 // gap + padding
    
    return {
      totalRows,
      gridHeight,
      columns: state.gridColumns
    }
  }, [totalItems, state.gridColumns, cellSize])

  return {
    ...state,
    isItemVisible,
    getGridMetrics,
    updateDimensions: updateGridDimensions
  }
}
