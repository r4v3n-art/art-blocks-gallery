import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
