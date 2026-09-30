"use client"

import { useEffect } from "react"
import { useGeneratorReady } from "@/hooks/useGeneratorReady"

export const GENERATOR_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
export const GENERATOR_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms"

interface GeneratorFrameProps {
  tokenId: string
  src: string
  title: string
  iframeKey: string
  showLoader: boolean
  className?: string
  style?: React.CSSProperties
  overlayClassName: string
  onReadyChange?: (ready: boolean, tokenId: string) => void
}

function GeneratorLoader() {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-current" />
      <span className="font-light text-xs tracking-[0.2em] uppercase opacity-70">
        Loading
      </span>
    </div>
  )
}

export function GeneratorFrame({
  tokenId,
  src,
  title,
  iframeKey,
  showLoader,
  className,
  style,
  overlayClassName,
  onReadyChange,
}: GeneratorFrameProps) {
  const { isReady, onIframeLoad, onIframeError } = useGeneratorReady(
    `${iframeKey}:${tokenId}:${src}`,
    showLoader
  )

  useEffect(() => {
    onReadyChange?.(isReady, tokenId)
  }, [isReady, tokenId, onReadyChange])

  return (
    <>
      <iframe
        key={iframeKey}
        src={src}
        className={`${className ?? ""} ${
          showLoader ? "transition-opacity duration-500" : ""
        } ${showLoader && !isReady ? "opacity-0" : "opacity-100"}`}
        style={style}
        title={title}
        allow={GENERATOR_IFRAME_ALLOW}
        sandbox={GENERATOR_IFRAME_SANDBOX}
        loading="eager"
        onLoad={showLoader ? onIframeLoad : undefined}
        onError={showLoader ? onIframeError : undefined}
      />
      {showLoader && (
        <div
          className={`absolute inset-0 z-[1] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${overlayClassName} ${
            isReady ? "opacity-0" : "opacity-100"
          }`}
          aria-busy={!isReady}
          aria-hidden={isReady}
        >
          <GeneratorLoader />
        </div>
      )}
    </>
  )
}
