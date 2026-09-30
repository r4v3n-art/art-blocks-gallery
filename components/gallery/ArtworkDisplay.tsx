"use client"

import { useState, useEffect, useRef } from "react"
import {
  computeContainFrame,
  computePlayerFrame,
  matChromePx,
  resolveAspectRatio,
} from "@/lib/aspectFrame"

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
  /** Reserve a right-side gutter so the TV caption does not overlap the art. */
  reserveCaptionGutter?: boolean
}

const MAT_SHADOW =
  "0 20px 40px rgba(0,0,0,0.18), 0 10px 20px rgba(0,0,0,0.1)"
const UNFRAMED_BORDER_SHADOW =
  "0 20px 40px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)"

export function ArtworkDisplay({
  currentNFT,
  nextNFT,
  showBorder,
  isFullscreen,
  useAspectFrame = true,
  reserveCaptionGutter = true,
}: ArtworkDisplayProps) {
  const [, setNextIframeLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState({ width: 0, height: 0, align: "center" as "left" | "center" })
  const aspectRatio = resolveAspectRatio(currentNFT.aspectRatio)

  useEffect(() => {
    setNextIframeLoaded(false)
  }, [currentNFT.tokenId])

  useEffect(() => {
    if (!useAspectFrame) return
    const el = containerRef.current
    if (!el) return

    const update = () => {
      if (reserveCaptionGutter) {
        setFrame(computePlayerFrame(el.clientWidth, el.clientHeight, aspectRatio))
      } else {
        const size = computeContainFrame(el.clientWidth, el.clientHeight, aspectRatio)
        setFrame({ ...size, align: "center" })
      }
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [aspectRatio, useAspectFrame, isFullscreen, reserveCaptionGutter])

  if (!useAspectFrame) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? "p-12" : ""}`}>
        <div
          className={`w-full h-full relative ${showBorder ? "bg-card p-4" : ""}`}
          style={showBorder ? { boxShadow: UNFRAMED_BORDER_SHADOW } : undefined}
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
              style={{ zIndex: -1 }}
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

  const chrome = matChromePx()
  const outerWidth = frame.width + chrome
  const outerHeight = frame.height + chrome

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex items-center bg-black ${
        frame.align === "left" ? "justify-start" : "justify-center"
      }`}
    >
      {frame.width > 0 && frame.height > 0 && (
        <div
          className="relative shrink-0 overflow-hidden border border-stone-300/70 bg-stone-50 p-4"
          style={{
            width: outerWidth,
            height: outerHeight,
            boxShadow: MAT_SHADOW,
          }}
        >
          <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden border border-stone-400/40">
            <iframe
              key={`current-${currentNFT.tokenId}-${showBorder}-${isFullscreen}`}
              src={currentNFT.generatorUrl}
              className="absolute inset-0 h-full w-full border-0"
              style={{ overflow: "hidden" }}
              title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="eager"
            />

            {nextNFT && (
              <iframe
                key={`next-${nextNFT.tokenId}-${showBorder}-${isFullscreen}`}
                src={nextNFT.generatorUrl}
                className="absolute inset-0 h-full w-full border-0 opacity-0 pointer-events-none"
                style={{ zIndex: -1 }}
                title={`Preloading: ${nextNFT.projectName} #${nextNFT.tokenId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms"
                loading="eager"
                onLoad={() => setNextIframeLoaded(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
