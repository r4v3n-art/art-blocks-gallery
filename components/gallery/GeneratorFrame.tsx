"use client"

import { useEffect } from "react"
import { useGeneratorReady } from "@/hooks/useGeneratorReady"
import { isCommittedGeneratorLoad } from "@/lib/generatorReady"

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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
      <span className="font-light text-xs tracking-[0.22em] uppercase text-stone-500">
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
        onLoad={
          showLoader
            ? (event) => {
                if (isCommittedGeneratorLoad(event.currentTarget)) onIframeLoad()
              }
            : undefined
        }
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
