"use client"

import { useEffect, useState } from "react"

export const AB_GQL_ENDPOINT = "https://artblocks-mainnet.hasura.app/v1/graphql"
// Placeholder/invalid engine address occasionally seen in bad rows
const ZERO_ENGINE_ADDRESS = "0x00000000e75eadc620f4fcefab32f5173749c3a4"

// Simple in-memory cache for GraphQL requests
type CacheEntry<T> = {
  data: T | null
  timestamp: number
  ttl: number
}

const requestCache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const pending = new Map<string, Promise<unknown>>()

// ENS resolution cache with 24-hour TTL
const ensCache = new Map<string, CacheEntry<string>>()
const ENS_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const ensPending = new Map<string, Promise<string | null>>()

function getCacheKey(query: string, variables: Record<string, unknown>): string {
  return JSON.stringify({ query: query.replace(/\s+/g, ' ').trim(), variables })
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp > entry.ttl
}

export async function graphqlRequest<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const cacheKey = getCacheKey(query, variables)
  
  // Check cache first
  const cached = requestCache.get(cacheKey) as CacheEntry<T> | undefined
  if (cached && !isExpired(cached)) {
    return cached.data
  }
  
  // Check if request is already pending (deduplication)
  const pendingRequest = pending.get(cacheKey) as Promise<T | null> | undefined
  if (pendingRequest) {
    return pendingRequest
  }
  
  // Make new request
  const requestPromise = (async (): Promise<T | null> => {
    try {
      const res = await fetch(AB_GQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      })
      if (!res.ok) return null
      const json = (await res.json()) as Record<string, unknown>
      const data = json && typeof json === "object" && "data" in json 
        ? (json as { data: T }).data 
        : null
      
      // Cache the result
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      })
      
      return data
    } catch {
      return null
    } finally {
      pending.delete(cacheKey)
    }
  })()
  
  pending.set(cacheKey, requestPromise)
  return requestPromise
}

function wrapIlike(term: string): string {
  return `%${term}%`
}

// ENS utility functions
function isEnsName(name: string): boolean {
  return name.endsWith('.eth') || name.includes('.eth.')
}

function isEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Resolve ENS name to address
export async function resolveEnsToAddress(ensName: string): Promise<string | null> {
  if (!isEnsName(ensName)) return null
  
  const cacheKey = `ens-to-addr:${ensName.toLowerCase()}`
  
  // Check cache first
  const cached = ensCache.get(cacheKey)
  if (cached && !isExpired(cached)) {
    return cached.data
  }
  
  // Check if request is already pending
  const pendingRequest = ensPending.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest
  }
  
  // Make new ENS resolution request
  const requestPromise = (async (): Promise<string | null> => {
    try {
      // Use public ENS resolver endpoint
      const response = await fetch(`https://ensdata.net/${ensName}`)
      if (!response.ok) return null
      
      const data = await response.json()
      const address = data?.address
      
      if (typeof address === 'string' && isEthAddress(address)) {
        // Cache the result
        ensCache.set(cacheKey, {
          data: address.toLowerCase(),
          timestamp: Date.now(),
          ttl: ENS_CACHE_TTL
        })
        return address.toLowerCase()
      }
      
      return null
    } catch {
      return null
    } finally {
      ensPending.delete(cacheKey)
    }
  })()
  
  ensPending.set(cacheKey, requestPromise)
  return requestPromise
}

// Resolve address to ENS name
export async function resolveAddressToEns(address: string): Promise<string | null> {
  if (!isEthAddress(address)) return null
  
  const cacheKey = `addr-to-ens:${address.toLowerCase()}`
  
  // Check cache first
  const cached = ensCache.get(cacheKey)
  if (cached && !isExpired(cached)) {
    return cached.data
  }
  
  // Check if request is already pending
  const pendingRequest = ensPending.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest
  }
  
  // Make new reverse ENS resolution request
  const requestPromise = (async (): Promise<string | null> => {
    try {
      // Use public ENS resolver endpoint for reverse lookup
      const response = await fetch(`https://ensdata.net/${address}`)
      if (!response.ok) return null
      
      const data = await response.json()
      // Check for primary ENS first, then fallback to ens field
      const ensName = data?.ens_primary || data?.ens
      
      if (typeof ensName === 'string' && isEnsName(ensName)) {
        // Cache the result
        ensCache.set(cacheKey, {
          data: ensName,
          timestamp: Date.now(),
          ttl: ENS_CACHE_TTL
        })
        return ensName
      }
      
      return null
    } catch {
      return null
    } finally {
      ensPending.delete(cacheKey)
    }
  })()
  
  ensPending.set(cacheKey, requestPromise)
  return requestPromise
}

export function useArtistInfo(artistTerm: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalTokens, setTotalTokens] = useState<number | null>(null)
  const [projects, setProjects] = useState<Array<{ id?: string; name?: string; artist_name?: string | null; invocations?: number | null; max_invocations?: number | null; contract_address?: string | null }>>([])

  useEffect(() => {
    let cancelled = false
    if (!artistTerm) {
      setTotalTokens(null)
      setProjects([])
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      const query = `
        query ArtistInfo($value: String!) {
          tokens_metadata_aggregate(where: { project: { artist_name: { _ilike: $value } } }) {
            aggregate { count }
          }
          projects_metadata(where: { artist_name: { _ilike: $value } }) {
            id
            name
            artist_name
            invocations
            max_invocations
            contract_address
          }
        }
      `
      const data = await graphqlRequest<Record<string, unknown>>(query, { value: wrapIlike(artistTerm) })
      if (cancelled) return
      if (!data) {
        setLoading(false)
        return
      }
      const agg = (data as Record<string, unknown>)?.tokens_metadata_aggregate as Record<string, unknown> | undefined
      let countVal: unknown = null
      if (agg && typeof agg === 'object' && 'aggregate' in agg) {
        const aggregate = (agg as { aggregate?: unknown }).aggregate
        if (aggregate && typeof aggregate === 'object' && 'count' in (aggregate as Record<string, unknown>)) {
          countVal = (aggregate as Record<string, unknown>).count
        }
      }
      const projs = (data as Record<string, unknown>)?.projects_metadata as unknown
      if (Array.isArray(projs)) {
        const mapped = (projs as Array<Record<string, unknown>>).map((p) => ({
          id: typeof p?.id === "string" ? (p.id as string) : undefined,
          name: typeof p?.name === "string" ? (p.name as string) : undefined,
          artist_name: typeof p?.artist_name === "string" ? (p.artist_name as string) : null,
          invocations: typeof p?.invocations === "number" ? (p.invocations as number) : null,
          max_invocations: typeof p?.max_invocations === "number" ? (p.max_invocations as number) : null,
          contract_address: typeof p?.contract_address === "string" ? (p.contract_address as string) : null,
        }))
        setProjects(mapped)
        // Fallback: sum invocations if aggregate count missing/zero
        if (!(typeof countVal === 'number' && countVal > 0)) {
          const sum = mapped.reduce((acc, p) => acc + (p.invocations ?? 0), 0)
          setTotalTokens(sum > 0 ? sum : null)
        } else {
          setTotalTokens(countVal as number)
        }
      } else {
        setProjects([])
        setTotalTokens(typeof countVal === 'number' ? (countVal as number) : null)
      }
      setLoading(false)
    })().catch((e) => {
      if (cancelled) return
      setError(e as Error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [artistTerm])

  return { loading, error, totalTokens, projects }
}

export function useProjectInfo(projectTerm: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalTokens, setTotalTokens] = useState<number | null>(null)
  const [projects, setProjects] = useState<Array<{ id?: string; name?: string; invocations?: number | null; max_invocations?: number | null; contract_address?: string | null }>>([])

  useEffect(() => {
    let cancelled = false
    if (!projectTerm) {
      setTotalTokens(null)
      setProjects([])
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      const query = `
        query ProjectInfo($value: String!) {
          tokens_metadata_aggregate(where: { project_name: { _ilike: $value } }) {
            aggregate { count }
          }
          projects_metadata(where: { name: { _ilike: $value } }) {
            id
            name
            invocations
            max_invocations
            contract_address
          }
        }
      `
      const data = await graphqlRequest<Record<string, unknown>>(query, { value: wrapIlike(projectTerm) })
      if (cancelled) return
      if (!data) {
        setLoading(false)
        return
      }
      const agg = (data as Record<string, unknown>)?.tokens_metadata_aggregate as Record<string, unknown> | undefined
      let countVal: unknown = null
      if (agg && typeof agg === 'object' && 'aggregate' in agg) {
        const aggregate = (agg as { aggregate?: unknown }).aggregate
        if (aggregate && typeof aggregate === 'object' && 'count' in (aggregate as Record<string, unknown>)) {
          countVal = (aggregate as Record<string, unknown>).count
        }
      }
      setTotalTokens(typeof countVal === "number" ? countVal : null)
      const projs = (data as Record<string, unknown>)?.projects_metadata as unknown
      if (Array.isArray(projs)) {
        const mapped = (projs as Array<Record<string, unknown>>).map((p) => ({
          id: typeof p?.id === "string" ? (p.id as string) : undefined,
          name: typeof p?.name === "string" ? (p.name as string) : undefined,
          invocations: typeof p?.invocations === "number" ? (p.invocations as number) : null,
          max_invocations: typeof p?.max_invocations === "number" ? (p.max_invocations as number) : null,
          contract_address: typeof p?.contract_address === "string" ? (p.contract_address as string) : null,
        }))
        setProjects(mapped)
      } else {
        setProjects([])
      }
      setLoading(false)
    })().catch((e) => {
      if (cancelled) return
      setError(e as Error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [projectTerm])

  return { loading, error, totalTokens, projects }
}

// -------- projects_metadata helpers & hooks --------
export type ProjectMetadata = {
  id?: string
  project_id?: string | null
  name?: string
  artist_name?: string | null
  invocations?: number | null
  max_invocations?: number | null
  contract_address?: string | null
}

export async function fetchProjectsByArtist(
  artistName: string,
  exact: boolean = true
): Promise<ProjectMetadata[]> {
  if (!artistName) return []
  const filter = exact ? `artist_name: { _eq: $value }` : `artist_name: { _ilike: $value }`
  const value = exact ? artistName : wrapIlike(artistName)
  const query = `
    query ProjectsByArtist($value: String!) {
      projects_metadata(where: { ${filter} }, order_by: { name: asc }) {
        id
        project_id
        name
        artist_name
        invocations
        max_invocations
        contract_address
      }
    }
  `
  const data = await graphqlRequest<{ projects_metadata?: Array<Record<string, unknown>> }>(query, { value })
  const list = data?.projects_metadata
  if (!Array.isArray(list)) return []
  return list.map((p) => ({
    id: typeof p?.id === 'string' ? (p.id as string) : undefined,
    project_id: typeof p?.project_id === 'string' ? (p.project_id as string) : null,
    name: typeof p?.name === 'string' ? (p.name as string) : undefined,
    artist_name: typeof p?.artist_name === 'string' ? (p.artist_name as string) : null,
    invocations: typeof p?.invocations === 'number' ? (p.invocations as number) : null,
    max_invocations: typeof p?.max_invocations === 'number' ? (p.max_invocations as number) : null,
    contract_address: typeof p?.contract_address === 'string' ? (p.contract_address as string) : null,
  }))
}

export function useProjectsByArtist(artistName: string, exact: boolean = true) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [projects, setProjects] = useState<ProjectMetadata[]>([])

  useEffect(() => {
    let cancelled = false
    if (!artistName) {
      setProjects([])
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const list = await fetchProjectsByArtist(artistName, exact)
        if (cancelled) return
        setProjects(list)
      } catch (e) {
        if (cancelled) return
        setError(e as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [artistName, exact])

  return { loading, error, projects }
}

export function useContractInfo(contractAddress: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalTokens, setTotalTokens] = useState<number | null>(null)
  const [projects, setProjects] = useState<Array<{ id?: string; name?: string; artist_name?: string | null; invocations?: number | null; max_invocations?: number | null; project_id?: string | null }>>([])

  useEffect(() => {
    let cancelled = false
    if (!contractAddress) {
      setTotalTokens(null)
      setProjects([])
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      const query = `
        query ContractInfo($contract: String!) {
          tokens_metadata_aggregate(where: { contract_address: { _eq: $contract } }) {
            aggregate { count }
          }
          projects_metadata(where: { contract_address: { _eq: $contract } }) {
            id
            name
            artist_name
            invocations
            max_invocations
            project_id
          }
        }
      `
      const data = await graphqlRequest<Record<string, unknown>>(query, { contract: contractAddress })
      if (cancelled) return
      if (!data) {
        setLoading(false)
        return
      }
      const agg = (data as Record<string, unknown>)?.tokens_metadata_aggregate as Record<string, unknown> | undefined
      let countVal: unknown = null
      if (agg && typeof agg === 'object' && 'aggregate' in agg) {
        const aggregate = (agg as { aggregate?: unknown }).aggregate
        if (aggregate && typeof aggregate === 'object' && 'count' in (aggregate as Record<string, unknown>)) {
          countVal = (aggregate as Record<string, unknown>).count
        }
      }
      setTotalTokens(typeof countVal === "number" ? countVal : null)
      const projs = (data as Record<string, unknown>)?.projects_metadata as unknown
      if (Array.isArray(projs)) {
        const mapped = (projs as Array<Record<string, unknown>>).map((p) => ({
          id: typeof p?.id === "string" ? (p.id as string) : undefined,
          name: typeof p?.name === "string" ? (p.name as string) : undefined,
          artist_name: typeof p?.artist_name === "string" ? (p.artist_name as string) : null,
          invocations: typeof p?.invocations === "number" ? (p.invocations as number) : null,
          max_invocations: typeof p?.max_invocations === "number" ? (p.max_invocations as number) : null,
          project_id: typeof p?.project_id === "string" ? (p.project_id as string) : null,
        }))
        setProjects(mapped)
      } else {
        setProjects([])
      }
      setLoading(false)
    })().catch((e) => {
      if (cancelled) return
      setError(e as Error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [contractAddress])

  return { loading, error, totalTokens, projects }
}

export function useCollectorInfo(ownerTerm: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalTokens, setTotalTokens] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!ownerTerm) {
      setTotalTokens(null)
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      const query = `
        query CollectorTotal($value: String!) {
          tokens_metadata_aggregate(where: { owner_address: { _ilike: $value } }) {
            aggregate { count }
          }
        }
      `
      const data = await graphqlRequest<Record<string, unknown>>(query, { value: wrapIlike(ownerTerm) })
      if (cancelled) return
      if (!data) {
        setLoading(false)
        return
      }
      const agg = (data as Record<string, unknown>)?.tokens_metadata_aggregate as Record<string, unknown> | undefined
      let countVal: unknown = null
      if (agg && typeof agg === 'object' && 'aggregate' in agg) {
        const aggregate = (agg as { aggregate?: unknown }).aggregate
        if (aggregate && typeof aggregate === 'object' && 'count' in (aggregate as Record<string, unknown>)) {
          countVal = (aggregate as Record<string, unknown>).count
        }
      }
      setTotalTokens(typeof countVal === 'number' ? countVal : null)
      setLoading(false)
    })().catch((e) => {
      if (cancelled) return
      setError(e as Error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [ownerTerm])

  return { loading, error, totalTokens }
}


export async function searchTokensByGraphQLAll(
  mode: "artist" | "project" | "collector",
  term: string,
  max = 100000
): Promise<Array<{ tokenId: string; contractAddress?: string }>> {
  const isAddr = mode === 'collector' && isEthAddress(term)
  const value = isAddr ? term.toLowerCase() : `%${term}%`
  const pageSize = 500
  let offset = 0
  const results: Array<{ tokenId: string; contractAddress?: string }> = []

  while (results.length < max) {
    let query = ""
    if (mode === "artist") {
      query = `
        query SearchByArtist($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { project: { artist_name: { _ilike: $value } } },
            limit: $limit,
            offset: $offset,
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
          }
        }
      `
    } else if (mode === "project") {
      query = `
        query SearchByProject($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { project_name: { _ilike: $value } },
            limit: $limit,
            offset: $offset,
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
          }
        }
      `
    } else {
      query = isAddr
        ? `
        query SearchByCollectorEq($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { owner_address: { _eq: $value } },
            limit: $limit,
            offset: $offset,
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
          }
        }
      `
        : `
        query SearchByCollectorLike($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { owner_address: { _ilike: $value } },
            limit: $limit,
            offset: $offset,
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
          }
        }
      `
    }

    // basic retry to avoid transient nulls/rate limit blips
    let attempts = 0
    let data: { tokens_metadata?: Array<Record<string, unknown>> } | null = null
    while (attempts < 3) {
      data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, {
        value,
        limit: pageSize,
        offset,
      })
      if (data) break
      attempts += 1
    }
    const list = data?.tokens_metadata
    if (!Array.isArray(list) || list.length === 0) break

    for (const itemRaw of list) {
      const item = itemRaw as Record<string, unknown>
      const tid = item?.token_id
      const ca = item?.contract_address
      if (typeof tid === "string") results.push({ tokenId: tid, contractAddress: typeof ca === "string" ? ca : undefined })
    }

    if (list.length < pageSize) break
    offset += pageSize
  }

  return results.slice(0, max)
}

// Exact-match variant for artist to avoid fuzzy mis-matches
export async function searchTokensByArtistExact(artistName: string, max = 100000): Promise<Array<{ tokenId: string; contractAddress?: string }>> {
  const pageSize = 500
  let offset = 0
  const results: Array<{ tokenId: string; contractAddress?: string }> = []
  while (results.length < max) {
    const query = `
      query SearchByArtistExact($name: String!, $limit: Int!, $offset: Int!) {
        tokens_metadata(
          where: { project: { artist_name: { _eq: $name } } },
          limit: $limit,
          offset: $offset,
          order_by: { token_id: asc }
        ) {
          token_id
          contract_address
        }
      }
    `
    const data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, {
      name: artistName,
      limit: pageSize,
      offset,
    })
    const list = data?.tokens_metadata
    if (!Array.isArray(list) || list.length === 0) break
    for (const itemRaw of list) {
      const item = itemRaw as Record<string, unknown>
      const tid = item?.token_id
      const ca = item?.contract_address
      if (typeof tid === 'string') results.push({ tokenId: tid, contractAddress: typeof ca === 'string' ? ca : undefined })
    }
    if (list.length < pageSize) break
    offset += pageSize
  }
  return results.slice(0, max)
}

export async function searchArtistsDistinct(term: string): Promise<string[]> {
  const query = `
    query ArtistsLike($name: String!) {
      projects_metadata(
        where: { artist_name: { _ilike: $name } }
        distinct_on: artist_name
        order_by: { artist_name: asc }
      ) {
        artist_name
      }
    }
  `
  const data = await graphqlRequest<{ projects_metadata?: Array<Record<string, unknown>> }>(query, {
    name: wrapIlike(term),
  })
  const list = data?.projects_metadata
  if (!Array.isArray(list)) return []
  const names: string[] = []
  for (const item of list) {
    const n = (item as Record<string, unknown>)?.artist_name
    if (typeof n === 'string') names.push(n)
  }
  return names
}

export type TokenEntry = {
  tokenId: string
  contractAddress?: string
  generatorUrl: string
  liveViewUrl?: string
  projectName?: string
  artistName?: string
  imageUrl?: string
  owner?: string
  invocation?: number
  projectId?: string
  projectWebsite?: string
  artistAddress?: string
  projectSlug?: string
}

export async function searchTokensWithLiveView(
  mode: 'artist' | 'project' | 'collector',
  term: string,
  max = 100000
): Promise<TokenEntry[]> {
  const value = `%${term}%`
  const pageSize = 100
  let offset = 0
  const results: TokenEntry[] = []

  while (results.length < max) {
    let query = ''
    if (mode === 'artist') {
      query = `
        query TokensByArtist($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { project: { artist_name: { _ilike: $value } } }
            limit: $limit
            offset: $offset
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
            live_view_url
            preview_asset_url
            owner_address
            invocation
            project { 
              id
              name 
              artist_name
              website
              artist_address
              slug
            }
          }
        }
      `
    } else if (mode === 'project') {
      query = `
        query TokensByProject($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { project_name: { _ilike: $value } }
            limit: $limit
            offset: $offset
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
            live_view_url
            preview_asset_url
            owner_address
            invocation
            project { 
              id
              name 
              artist_name
              website
              artist_address
              slug
            }
          }
        }
      `
    } else {
      query = `
        query TokensByCollector($value: String!, $limit: Int!, $offset: Int!) {
          tokens_metadata(
            where: { owner_address: { _ilike: $value } }
            limit: $limit
            offset: $offset
            order_by: { token_id: asc }
          ) {
            token_id
            contract_address
            live_view_url
            preview_asset_url
            owner_address
            invocation
            project { 
              id
              name 
              artist_name
              website
              artist_address
              slug
            }
          }
        }
      `
    }

    const data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, {
      value,
      limit: pageSize,
      offset,
    })
    const list = data?.tokens_metadata
    if (!Array.isArray(list) || list.length === 0) break

    for (const itemRaw of list) {
      const item = itemRaw as Record<string, unknown>
      const tid = item?.token_id
      const ca = item?.contract_address
      const liveUrl = item?.live_view_url
      const previewUrl = item?.preview_asset_url
      const owner = item?.owner_address
      const invocation = item?.invocation
      const proj = item?.project as Record<string, unknown> | undefined
      
      if (typeof tid === 'string') {
        // Use live_view_url if available, otherwise construct generator URL
        const generatorUrl = typeof liveUrl === 'string' && liveUrl 
          ? liveUrl 
          : composeGeneratorUrl(tid, typeof ca === 'string' ? ca : undefined)
        
        results.push({
          tokenId: tid,
          contractAddress: typeof ca === 'string' ? ca : undefined,
          generatorUrl,
          liveViewUrl: typeof liveUrl === 'string' ? liveUrl : undefined,
          imageUrl: typeof previewUrl === 'string' ? previewUrl : composeMediaUrl(tid, typeof ca === 'string' ? ca : undefined),
          owner: typeof owner === 'string' ? owner : undefined,
          invocation: typeof invocation === 'number' ? invocation : undefined,
          projectName: proj && typeof proj.name === 'string' ? (proj.name as string) : undefined,
          artistName: proj && typeof proj.artist_name === 'string' ? (proj.artist_name as string) : undefined,
          projectId: proj && typeof proj.id === 'string' ? (proj.id as string) : undefined,
          projectWebsite: proj && typeof proj.website === 'string' ? (proj.website as string) : undefined,
          artistAddress: proj && typeof proj.artist_address === 'string' ? (proj.artist_address as string) : undefined,
          projectSlug: proj && typeof proj.slug === 'string' ? (proj.slug as string) : undefined,
        })
      }
    }

    if (list.length < pageSize) break
    offset += pageSize
  }

  return results.slice(0, max)
}

export async function tokensByIdWithLiveView(tokenIds: string[], max = 100000): Promise<TokenEntry[]> {
  if (tokenIds.length === 0) return []
  // Query in chunks to avoid large IN lists
  const chunkSize = 100
  const entries: TokenEntry[] = []
  for (let i = 0; i < tokenIds.length && entries.length < max; i += chunkSize) {
    const chunk = tokenIds.slice(i, i + chunkSize)
    const query = `
      query TokensByIds($ids: [String!]!) {
        tokens_metadata(where: { token_id: { _in: $ids } }, order_by: { token_id: asc }) {
          token_id
          contract_address
          live_view_url
          preview_asset_url
          owner_address
          invocation
          project { 
            id
            name 
            artist_name
            website
            artist_address
            slug
          }
        }
      }
    `
    const data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, { ids: chunk })
    const list = data?.tokens_metadata
    if (!Array.isArray(list)) continue
    for (const itemRaw of list) {
      const item = itemRaw as Record<string, unknown>
      const tid = item?.token_id
      const ca = item?.contract_address
      const liveUrl = item?.live_view_url
      const previewUrl = item?.preview_asset_url
      const owner = item?.owner_address
      const invocation = item?.invocation
      const proj = item?.project as Record<string, unknown> | undefined
      
      if (typeof tid === 'string') {
        // Guard against bad placeholder engine rows
        const bad = typeof ca === 'string' && ca.toLowerCase() === ZERO_ENGINE_ADDRESS
        const generatorUrl = (typeof liveUrl === 'string' && liveUrl && !bad)
          ? liveUrl
          : composeGeneratorUrl(tid, typeof ca === 'string' && !bad ? ca : undefined)
        
        entries.push({
          tokenId: tid,
          contractAddress: typeof ca === 'string' ? ca : undefined,
          generatorUrl,
          liveViewUrl: typeof liveUrl === 'string' ? liveUrl : undefined,
          imageUrl: typeof previewUrl === 'string' ? previewUrl : composeMediaUrl(tid, typeof ca === 'string' ? ca : undefined),
          owner: typeof owner === 'string' ? owner : undefined,
          invocation: typeof invocation === 'number' ? invocation : undefined,
          projectName: proj && typeof proj.name === 'string' ? (proj.name as string) : undefined,
          artistName: proj && typeof proj.artist_name === 'string' ? (proj.artist_name as string) : undefined,
          projectId: proj && typeof proj.id === 'string' ? (proj.id as string) : undefined,
          projectWebsite: proj && typeof proj.website === 'string' ? (proj.website as string) : undefined,
          artistAddress: proj && typeof proj.artist_address === 'string' ? (proj.artist_address as string) : undefined,
          projectSlug: proj && typeof proj.slug === 'string' ? (proj.slug as string) : undefined,
        })
      }
    }
  }
  return entries.slice(0, max)
}

// URL composition helpers based on API overview docs
// https://docs.artblocks.io/creator-docs/art-blocks-api/api-overview/
export function composeTokenApiUrl(tokenId: string, contractAddress?: string): string {
  return contractAddress
    ? `https://token.artblocks.io/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}`
    : `https://token.artblocks.io/${encodeURIComponent(tokenId)}`
}

export function composeGeneratorUrl(tokenId: string, contractAddress?: string): string {
  return contractAddress
    ? `https://generator.artblocks.io/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}`
    : `https://generator.artblocks.io/${encodeURIComponent(tokenId)}`
}

export function composeMediaUrl(tokenId: string, contractAddress?: string): string {
  return contractAddress
    ? `https://media-proxy.artblocks.io/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}.png`
    : `https://media.artblocks.io/${encodeURIComponent(tokenId)}.png`
}

// Selection utilities
export type SelectionItem = { type: 'artist' | 'project' | 'collector' | 'token'; value: string }

export function serializeSelection(items: SelectionItem[]): string {
  // Return raw type:value pairs; the caller (URLSearchParams) will encode
  return items.map(i => `${i.type}:${i.value}`).join(',')
}

function decodeFully(s: string): string {
  let prev = s
  while (true) {
    try {
      const next = decodeURIComponent(prev)
      if (next === prev) return next
      prev = next
    } catch {
      return prev
    }
  }
}

export function parseSelection(param: string | null | undefined): SelectionItem[] {
  if (!param) return []
  const decoded = decodeFully(param)
  const raw = decoded.split(',').map(s => s.trim()).filter(Boolean)
  const items: SelectionItem[] = []
  for (const part of raw) {
    const idx = part.indexOf(':')
    if (idx <= 0) continue
    const typeStr = part.slice(0, idx)
    const value = part.slice(idx + 1)
    const type = typeStr as SelectionItem['type']
    if (value && (type === 'artist' || type === 'project' || type === 'collector' || type === 'token')) {
      items.push({ type, value })
    }
  }
  return items
}

export async function resolveSelectionTokenIds(items: SelectionItem[], max = 100000): Promise<string[]> {
  const unique = new Set<string>()
  for (const it of items) {
    if (it.type === 'token') {
      unique.add(it.value)
    } else if (it.type === 'artist') {
      // Prefer exact match first, then fallback to fuzzy
      let rows = await searchTokensByArtistExact(it.value, max)
      if (rows.length === 0) {
        rows = await searchTokensByGraphQLAll('artist', it.value, max)
      }
      // Filter out placeholder engine address rows
      rows = rows.filter(r => !r.contractAddress || r.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS)
      rows.forEach(r => unique.add(r.tokenId))
    } else if (it.type === 'project') {
      const rows = await searchTokensByGraphQLAll('project', it.value, max)
      const filtered = rows.filter(r => !r.contractAddress || r.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS)
      filtered.forEach(r => unique.add(r.tokenId))
    } else if (it.type === 'collector') {
      const rows = await searchTokensByCollector(it.value, max)
      const filtered = rows.filter(r => !r.contractAddress || r.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS)
      filtered.forEach(r => unique.add(r.tokenId))
    }
    if (unique.size >= max) break
  }
  return Array.from(unique)
}

export async function resolveSelectionToTokenEntries(items: SelectionItem[], max = 100000): Promise<TokenEntry[]> {
  const entriesMap = new Map<string, TokenEntry>()
  
  for (const it of items) {
    if (it.type === 'token') {
      // Fetch individual token data
      const entries = await tokensByIdWithLiveView([it.value], 1)
      if (entries[0]) {
        entriesMap.set(it.value, entries[0])
      }
    } else if (it.type === 'artist') {
      // Use searchTokensWithLiveView for full metadata
      const entries = await searchTokensWithLiveView('artist', it.value, max - entriesMap.size)
      for (const entry of entries) {
        if (!entry.contractAddress || entry.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS) {
          entriesMap.set(entry.tokenId, entry)
        }
      }
    } else if (it.type === 'project') {
      const entries = await searchTokensWithLiveView('project', it.value, max - entriesMap.size)
      for (const entry of entries) {
        if (!entry.contractAddress || entry.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS) {
          entriesMap.set(entry.tokenId, entry)
        }
      }
    } else if (it.type === 'collector') {
      const entries = await searchTokensWithLiveView('collector', it.value, max - entriesMap.size)
      for (const entry of entries) {
        if (!entry.contractAddress || entry.contractAddress.toLowerCase() !== ZERO_ENGINE_ADDRESS) {
          entriesMap.set(entry.tokenId, entry)
        }
      }
    }
    if (entriesMap.size >= max) break
  }
  
  return Array.from(entriesMap.values()).slice(0, max)
}

// -------- users-aware collector helpers --------
async function fetchUserAddressesByTerm(term: string): Promise<string[]> {
  // If ENS name, resolve to address first
  if (isEnsName(term)) {
    const resolvedAddress = await resolveEnsToAddress(term)
    if (resolvedAddress) {
      // Search by the resolved address
      const q = `
        query UsersByAddr($addr: String!) {
          users(where: { public_address: { _eq: $addr } }) { public_address }
        }
      `
      const data = await graphqlRequest<{ users?: Array<Record<string, unknown>> }>(q, { addr: resolvedAddress })
      const list = data?.users
      if (!Array.isArray(list)) return [resolvedAddress] // Return resolved address even if not in users table
      const addrs: string[] = []
      for (const u of list) {
        const a = (u as Record<string, unknown>)?.public_address
        if (typeof a === 'string') addrs.push(a.toLowerCase())
      }
      return addrs.length > 0 ? addrs : [resolvedAddress]
    }
    return []
  }
  
  // If hex address, exact public_address match
  if (isEthAddress(term)) {
    const q = `
      query UsersByAddr($addr: String!) {
        users(where: { public_address: { _eq: $addr } }) { public_address }
      }
    `
    const data = await graphqlRequest<{ users?: Array<Record<string, unknown>> }>(q, { addr: term.toLowerCase() })
    const list = data?.users
    if (!Array.isArray(list)) return []
    const addrs: string[] = []
    for (const u of list) {
      const a = (u as Record<string, unknown>)?.public_address
      if (typeof a === 'string') addrs.push(a.toLowerCase())
    }
    return addrs
  }

  // Otherwise, match by display_name
  const q = `
    query UsersByName($value: String!) {
      users(where: { display_name: { _ilike: $value } }) { public_address }
    }
  `
  const data = await graphqlRequest<{ users?: Array<Record<string, unknown>> }>(q, { value: wrapIlike(term) })
  const list = data?.users
  if (!Array.isArray(list)) return []
  const addrs: string[] = []
  for (const u of list) {
    const a = (u as Record<string, unknown>)?.public_address
    if (typeof a === 'string') addrs.push(a.toLowerCase())
  }
  return addrs
}

export async function searchTokensByCollector(term: string, max = 100000): Promise<Array<{ tokenId: string; contractAddress?: string }>> {
  const addresses = await fetchUserAddressesByTerm(term)
  const useIn = addresses.length > 0
  const pageSize = 500
  let offset = 0
  const results: Array<{ tokenId: string; contractAddress?: string }>= []
  while (results.length < max) {
    const query = useIn
      ? `
      query TokensByOwners($owners: [String!], $limit: Int!, $offset: Int!) {
        tokens_metadata(
          where: { owner_address: { _in: $owners } },
          limit: $limit,
          offset: $offset,
          order_by: { token_id: asc }
        ) {
          token_id
          contract_address
        }
      }
    `
      : `
      query TokensByOwnerFallback($value: String!, $limit: Int!, $offset: Int!) {
        tokens_metadata(
          where: { owner_address: { ${isEthAddress(term) ? '_eq' : '_ilike'}: $value } },
          limit: $limit,
          offset: $offset,
          order_by: { token_id: asc }
        ) {
          token_id
          contract_address
        }
      }
    `
    const variables = useIn
      ? { owners: addresses, limit: pageSize, offset }
      : { value: isEthAddress(term) ? term.toLowerCase() : wrapIlike(term), limit: pageSize, offset }
    const data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, variables)
    const list = data?.tokens_metadata
    if (!Array.isArray(list) || list.length === 0) break
    for (const itemRaw of list) {
      const item = itemRaw as Record<string, unknown>
      const tid = item?.token_id
      const ca = item?.contract_address
      if (typeof tid === 'string') results.push({ tokenId: tid, contractAddress: typeof ca === 'string' ? ca : undefined })
    }
    if (list.length < pageSize) break
    offset += pageSize
  }
  return results.slice(0, max)
}


