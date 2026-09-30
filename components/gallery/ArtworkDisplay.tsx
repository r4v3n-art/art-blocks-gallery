"use client"

import { useState, useEffect, useRef } from "react"
import { computeContainFrame, resolveAspectRatio } from "@/lib/aspectFrame"

interface NFTMeta {
  tokenId: string
  projectName?: string
  generatorUrl: string
  aspectRatio?: number
}

interface ArtworkDisplayProps {
  currentNFT: NFTMeta
  nextNFT: NFTMeta | null
  showBorder: boolean
  isFullscreen: boolean
  /** When true (default), size the generator to the project's aspect ratio. */
  useAspectFrame?: boolean
}

export function ArtworkDisplay({
  currentNFT,
  nextNFT,
  showBorder,
  isFullscreen,
  useAspectFrame = true,
}: ArtworkDisplayProps) {
  const [, setNextIframeLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })
  const aspectRatio = resolveAspectRatio(currentNFT.aspectRatio)

  useEffect(() => {
    setNextIframeLoaded(false)
  }, [currentNFT.tokenId])

  useEffect(() => {
    if (!useAspectFrame) return
    const el = containerRef.current
    if (!el) return

    const update = () => {
      setFrameSize(computeContainFrame(el.clientWidth, el.clientHeight, aspectRatio))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [aspectRatio, useAspectFrame, isFullscreen])

  if (!useAspectFrame) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? 'p-12' : ''}`}>
        {/* Container with border that contains the iframe */}
        <div
          className={`w-full h-full relative ${showBorder ? 'bg-card p-4' : ''}`}
          style={showBorder ? {
            boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)'
          } : undefined}
        >
          {/* Main iframe - fills the entire available space inside the padding */}
          <iframe
            key={`current-${currentNFT.tokenId}-${showBorder}-${isFullscreen}`}
            src={currentNFT.generatorUrl}
            className="w-full h-full border-0"
            title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="eager"
          />

          {/* Preload iframe */}
          {nextNFT && (
            <iframe
              key={`next-${nextNFT.tokenId}-${showBorder}-${isFullscreen}`}
              src={nextNFT.generatorUrl}
              className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
              style={{
                zIndex: -1
              }}
              title={`Preloading: ${nextNFT.projectName} #${nextNFT.tokenId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="eager"
              onLoad={() => setNextIframeLoaded(true)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center bg-black"
    >
      {frameSize.width > 0 && frameSize.height > 0 && (
        <div
          className="relative overflow-hidden"
          style={{
            width: frameSize.width,
            height: frameSize.height,
            ...(showBorder ? {
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.08)'
            } : undefined),
          }}
        >
          <iframe
            key={`current-${currentNFT.tokenId}-${showBorder}-${isFullscreen}`}
            src={currentNFT.generatorUrl}
            className="w-full h-full border-0"
            title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="eager"
          />

          {nextNFT && (
            <iframe
              key={`next-${nextNFT.tokenId}-${showBorder}-${isFullscreen}`}
              src={nextNFT.generatorUrl}
              className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
              style={{
                zIndex: -1
              }}
              title={`Preloading: ${nextNFT.projectName} #${nextNFT.tokenId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="eager"
              onLoad={() => setNextIframeLoaded(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
