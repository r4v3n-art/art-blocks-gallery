import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useState, useEffect } from "react"
import { resolveAddressToEns } from "./ab.ts"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateEthAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address || address.length <= prefixLength + suffixLength) {
    return address
  }
  
  const prefix = address.slice(0, prefixLength)
  const suffix = address.slice(-suffixLength)
  return `${prefix}...${suffix}`
}

// Hook to resolve and display ENS name or fallback to truncated address
export function useEnsOrAddress(address: string | undefined): string {
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let cancelled = false

    if (!address) {
      setDisplayName('')
      return
    }

    // Start with truncated address as fallback
    setDisplayName(truncateEthAddress(address))

    // Try to resolve ENS name
    resolveAddressToEns(address)
      .then(ensName => {
        if (!cancelled && ensName) {
          setDisplayName(ensName)
        }
      })
      .catch(() => {
        // Keep truncated address on error
      })

    return () => {
      cancelled = true
    }
  }, [address])

  return displayName
}
