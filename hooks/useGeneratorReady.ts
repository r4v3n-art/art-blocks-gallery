"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  GENERATOR_READY_FALLBACK_MS,
  afterNextPaint,
  isArtBlocksOrigin,
  isGeneratorReadyMessage,
} from "@/lib/generatorReady"

/**
 * Hide the live generator until it is actually painted.
 *
 * Ready when any of:
 * 1. iframe `load` + two animation frames (scripts ran; first canvas paint)
 * 2. a postMessage from an artblocks.io origin that looks like a ready event
 * 3. fallback timeout so a hung generator cannot block the gallery forever
 */
export function useGeneratorReady(tokenKey: string, enabled: boolean) {
  const [isReady, setIsReady] = useState(!enabled)
  const [seenKey, setSeenKey] = useState(tokenKey)
  const generationRef = useRef(0)
  const cancelPaintRef = useRef<(() => void) | null>(null)

  // Reset in the same render as a token change so the previous piece's
  // "ready" state cannot flash the next iframe empty.
  if (seenKey !== tokenKey) {
    setSeenKey(tokenKey)
    setIsReady(!enabled)
  }

  useEffect(() => {
    if (!enabled) {
      setIsReady(true)
      return
    }

    const generation = ++generationRef.current
    setIsReady(false)

    const markReady = () => {
      if (generationRef.current !== generation) return
      cancelPaintRef.current?.()
      cancelPaintRef.current = null
      setIsReady(true)
    }

    const onMessage = (event: MessageEvent) => {
      if (!isArtBlocksOrigin(event.origin)) return
      if (isGeneratorReadyMessage(event.data)) markReady()
    }

    window.addEventListener("message", onMessage)
    const timeout = window.setTimeout(markReady, GENERATOR_READY_FALLBACK_MS)

    return () => {
      generationRef.current++
      cancelPaintRef.current?.()
      cancelPaintRef.current = null
      window.removeEventListener("message", onMessage)
      window.clearTimeout(timeout)
    }
  }, [tokenKey, enabled])

  const onIframeLoad = useCallback(() => {
    const generation = generationRef.current
    cancelPaintRef.current?.()
    cancelPaintRef.current = afterNextPaint(() => {
      if (generationRef.current === generation) {
        setIsReady(true)
      }
    })
  }, [])

  const onIframeError = useCallback(() => {
    setIsReady(true)
  }, [])

  return { isReady, onIframeLoad, onIframeError }
}
