"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { graphqlRequest, type TokenEntry } from "@/lib/ab"

interface GridDataState {
  tokens: TokenEntry[]
  loading: boolean
  error: string | null
  progress: {
    loaded: number
    total: number
    percentage: number
  }
  projectName?: string
  artistName?: string
  totalTokens?: number
  isSubset?: boolean
}

export function useGridData(slug: string, requestedItems: number = 100) {
  const mountedRef = useRef(true)
  
  const [state, setState] = useState<GridDataState>({
    tokens: [],
    loading: true, // Loading should be true initially
    error: null,
    progress: { loaded: 0, total: 0, percentage: 0 }
  })

  const loadTokens = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // For grid view, we need to find the project by slug
      const query = `
        query GetProjectTokens($slug: String!) {
          projects_metadata(where: { 
            slug: { _eq: $slug }
          }) {
            name
            invocations
            artist_name
            contract_address
            project_id
          }
        }
      `

      // First get the project metadata from the slug
      
      const data = await graphqlRequest<{ projects_metadata?: Array<Record<string, unknown>> }>(query, { 
        slug
      })
      const project = data?.projects_metadata?.[0]
      
      if (!project) {
        throw new Error(`Project with slug '${slug}' not found`)
      }

      const projectName = typeof project.name === 'string' ? project.name : ''
      const artistName = typeof project.artist_name === 'string' ? project.artist_name : ''
      const expectedTotal = typeof project.invocations === 'number' ? project.invocations : 1000
      const contractAddress = typeof project.contract_address === 'string' ? project.contract_address : ''
      const projectId = typeof project.project_id === 'string' ? project.project_id : ''
      
      if (!projectName) {
        throw new Error(`Project with slug '${slug}' has no name`)
      }
      
      if (!projectId) {
        throw new Error(`Project with slug '${slug}' has no project_id`)
      }

      // Update with expected total
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          progress: { ...prev.progress, total: expectedTotal }
        }))
      }

      // For Art Blocks projects, token IDs are sequential starting from 0
      const itemsToLoad = Math.min(requestedItems, expectedTotal)
      
      // If there are more tokens than requested, select a random subset
      let selectedIndices: number[]
      if (expectedTotal > itemsToLoad) {
        // Create an array of all indices and shuffle it
        const allIndices = Array.from({ length: expectedTotal }, (_, i) => i)
        // Fisher-Yates shuffle
        for (let i = allIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]]
        }
        // Take first itemsToLoad indices and sort them for better cache locality
        selectedIndices = allIndices.slice(0, itemsToLoad).sort((a, b) => a - b)
        
        console.log(`Project has ${expectedTotal} tokens, showing random ${itemsToLoad}`)
      } else {
        // Use all available tokens if under the limit
        selectedIndices = Array.from({ length: itemsToLoad }, (_, i) => i)
      }
      
      // Generate tokens with correct Art Blocks token IDs: projectId * 1000000 + invocation
      const tokens: TokenEntry[] = selectedIndices.map(index => {
        const tokenId = (parseInt(projectId) * 1000000 + index).toString()
        const generatorUrl = `https://generator.artblocks.io/${tokenId}`
        
        return {
          tokenId,
          contractAddress: contractAddress,
          generatorUrl,
          // Don't set imageUrl - let SmartImage compose it with the right size
          projectName,
          artistName,
          projectId,
          invocation: index
        }
      })
      
      
      // Update final state
      if (mountedRef.current) {
        setState(prev => {
          const newState = {
            ...prev,
            tokens,
            loading: false,
            projectName,
            artistName,
            totalTokens: expectedTotal,
            isSubset: expectedTotal > itemsToLoad,
            progress: {
              loaded: tokens.length,
              total: tokens.length,
              percentage: 100
            }
          }
          return newState
        })
      }

    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load tokens'
        }))
      }
    }
  }, [slug, requestedItems])

  useEffect(() => {
    mountedRef.current = true
    loadTokens()
    return () => {
      mountedRef.current = false
    }
  }, [loadTokens])

  return {
    ...state,
    refetch: loadTokens,
    contractAddress: state.tokens[0]?.contractAddress
  }
}
