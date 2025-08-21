"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ZoomIn, ZoomOut, Grid3X3 } from "lucide-react"
import { ProgressiveLoadingIndicator } from "./GridLoadingState"

interface GridHeaderProps {
  tokenCount: number
  projectName?: string
  artistName?: string
  zoomLevel: number
  onZoomChange: (zoom: number) => void
  isProgressiveLoading: boolean
  gridColumns: number
  cellSize: number
}

export function GridHeader({
  tokenCount,
  projectName,
  artistName,
  zoomLevel,
  onZoomChange,
  isProgressiveLoading,
  gridColumns,
  cellSize
}: GridHeaderProps) {
  const router = useRouter()

  const handleZoomIn = () => {
    onZoomChange(Math.min(3, zoomLevel + 0.1))
  }

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.1, zoomLevel - 0.1))
  }

  const handleZoomReset = () => {
    onZoomChange(1)
  }

  const goBack = () => {
    router.push('/search')
  }

  return (
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="px-4 py-3">
        {/* Main header row */}
        <div className="flex items-center justify-between mb-2">
          {/* Left side - Back button and project info */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-5 h-5 text-gray-600" />
              <div className="space-y-0.5">
                {projectName && (
                  <h1 className="font-medium text-lg leading-none">{projectName}</h1>
                )}
                {artistName && (
                  <p className="text-sm text-gray-600 leading-none">by {artistName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Zoom controls */}
          <div className="flex items-center gap-4">
            <ProgressiveLoadingIndicator 
              isProgressiveLoading={isProgressiveLoading}
              className="hidden md:flex"
            />
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.2}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2 min-w-32">
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={handleZoomReset}
                  className="text-sm text-gray-600 hover:text-gray-900 w-12 text-right"
                  title="Reset zoom to 100%"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span>{tokenCount.toLocaleString()} tokens</span>
            <span>{gridColumns} columns</span>
            <span>{cellSize}px cells</span>
          </div>
          
          {/* Mobile progressive loading indicator */}
          <ProgressiveLoadingIndicator 
            isProgressiveLoading={isProgressiveLoading}
            className="md:hidden"
          />
        </div>
      </div>
    </div>
  )
}

interface GridStatsProps {
  tokenCount: number
  loadedCount: number
  failedCount: number
  className?: string
}

export function GridStats({ 
  tokenCount, 
  loadedCount, 
  failedCount, 
  className = "" 
}: GridStatsProps) {
  const successRate = tokenCount > 0 ? ((loadedCount / tokenCount) * 100).toFixed(1) : '0'
  
  return (
    <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
      <div>Images: {loadedCount.toLocaleString()} loaded, {failedCount.toLocaleString()} failed</div>
      <div>Success rate: {successRate}%</div>
    </div>
  )
}
