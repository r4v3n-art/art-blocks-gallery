"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { searchTokensByGraphQLAll, composeMediaUrl, composeGeneratorUrl, searchArtistsDistinct, serializeSelection, parseArtBlocksUrl, isEnsName, resolveEnsToAddress, isEthAddress } from "@/lib/ab"
import { truncateEthAddress } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import Link from "next/link"

type SearchResult = {
  tokenId: string
  projectName?: string
  artist?: string
  imageUrl: string
  generatorUrl: string
  collectorAddress?: string
  contractAddress?: string
  invocation?: number
}

const AB_GQL_ENDPOINT = 'https://artblocks-mainnet.hasura.app/v1/graphql'

async function graphqlRequest<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(AB_GQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as Record<string, unknown>
    if (json && typeof json === 'object' && 'data' in json) {
      return (json as { data: T }).data
    }
    return null
  } catch {
    return null
  }
}

async function fetchContractForToken(tokenId: string): Promise<string | undefined> {
  const query = `
    query TokenContract($tokenId: String!, $limit: Int!) {
      tokens_metadata(where: { token_id: { _eq: $tokenId } }, limit: $limit) {
        token_id
        contract_address
      }
    }
  `
  const data = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, { tokenId, limit: 1 })
  const list = data?.tokens_metadata
  if (Array.isArray(list) && list.length > 0) {
    const item = list[0]
    const ca = (item as Record<string, unknown>)?.contract_address
    if (typeof ca === 'string' && ca) return ca
  }
  return undefined
}

async function fetchTokenMetadata(tokenId: string, signal?: AbortSignal, contractHint?: string): Promise<SearchResult | null> {
  try {
    // First try to get metadata from GraphQL
    let query: string
    let variables: Record<string, unknown>
    
    if (contractHint) {
      // Query by both contract address and token ID for precise matching
      query = `
        query TokenMetadata($tokenId: String!, $contractAddress: String!) {
          tokens_metadata(where: { 
            token_id: { _eq: $tokenId }, 
            contract_address: { _eq: $contractAddress } 
          }, limit: 1) {
            token_id
            contract_address
            live_view_url
            preview_asset_url
            owner_address
            invocation
            project { name artist_name }
          }
        }
      `
      variables = { tokenId, contractAddress: contractHint }
    } else {
      // Fallback to token ID only (less reliable)
      query = `
        query TokenMetadata($tokenId: String!) {
          tokens_metadata(where: { token_id: { _eq: $tokenId } }, limit: 1) {
            token_id
            contract_address
            live_view_url
            preview_asset_url
            owner_address
            invocation
            project { name artist_name }
          }
        }
      `
      variables = { tokenId }
    }
    
    const gqlData = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(query, variables)
    const gqlToken = gqlData?.tokens_metadata?.[0]
    
    if (gqlToken) {
      const proj = gqlToken.project as Record<string, unknown> | undefined
      return {
        tokenId,
        projectName: proj && typeof proj.name === 'string' ? proj.name : undefined,
        artist: proj && typeof proj.artist_name === 'string' ? proj.artist_name : undefined,
        imageUrl: typeof gqlToken.preview_asset_url === 'string' ? gqlToken.preview_asset_url : `https://media.artblocks.io/${encodeURIComponent(tokenId)}.png`,
        generatorUrl: typeof gqlToken.live_view_url === 'string' ? gqlToken.live_view_url : `https://generator.artblocks.io/${encodeURIComponent(tokenId)}`,
        collectorAddress: typeof gqlToken.owner_address === 'string' ? gqlToken.owner_address : undefined,
        contractAddress: typeof gqlToken.contract_address === 'string' ? gqlToken.contract_address : contractHint,
        invocation: typeof gqlToken.invocation === 'number' ? gqlToken.invocation : undefined,
      }
    }
    
    // Fallback to token API if GraphQL fails
    const url = contractHint
      ? `https://token.artblocks.io/${encodeURIComponent(contractHint)}/${encodeURIComponent(tokenId)}`
      : `https://token.artblocks.io/${encodeURIComponent(tokenId)}`
    const res = await fetch(url, { signal })
    if (!res.ok) {
      const discovered = contractHint ?? (await fetchContractForToken(tokenId))
      if (discovered) {
        return {
          tokenId,
          contractAddress: discovered,
          imageUrl: `https://media-proxy.artblocks.io/${encodeURIComponent(discovered)}/${encodeURIComponent(tokenId)}.png`,
          generatorUrl: `https://generator.artblocks.io/${encodeURIComponent(discovered)}/${encodeURIComponent(tokenId)}`,
        }
      }
      return {
        tokenId,
        imageUrl: `https://media.artblocks.io/${encodeURIComponent(tokenId)}.png`,
        generatorUrl: `https://generator.artblocks.io/${encodeURIComponent(tokenId)}`,
      }
    }
    const data = (await res.json()) as Record<string, unknown>

    // project name
    const projectFromRoot =
      typeof (data as Record<string, unknown>).project_name === 'string'
        ? (data as Record<string, unknown>).project_name
        : typeof (data as Record<string, unknown>).projectName === 'string'
          ? (data as Record<string, unknown>).projectName
          : undefined
    const projectField = (data as Record<string, unknown>).project
    let projectName: string | undefined = projectFromRoot as string | undefined
    if (!projectName && projectField && typeof projectField === 'object') {
      const po = projectField as Record<string, unknown>
      if (typeof po.name === 'string') projectName = po.name
      else if (typeof (projectField as unknown) === 'string') projectName = projectField as unknown as string
    }

    // artist
    let artist: string | undefined = undefined
    if (typeof (data as Record<string, unknown>).artist === 'string') artist = (data as Record<string, unknown>).artist as string
    else if (typeof (data as Record<string, unknown>).artist_name === 'string') artist = (data as Record<string, unknown>).artist_name as string
    else if (typeof (data as Record<string, unknown>).artistName === 'string') artist = (data as Record<string, unknown>).artistName as string
    if (!artist && projectField && typeof projectField === 'object') {
      const po = projectField as Record<string, unknown>
      if (typeof po.artist === 'string') artist = po.artist
    }

    // image url
    let imageUrl: string = `https://media.artblocks.io/${encodeURIComponent(tokenId)}.png`
    if (typeof (data as Record<string, unknown>).image === 'string') imageUrl = (data as Record<string, unknown>).image as string
    else if (typeof (data as Record<string, unknown>).image_url === 'string') imageUrl = (data as Record<string, unknown>).image_url as string
    else if ((data as Record<string, unknown>).media && typeof (data as Record<string, unknown>).media === 'object') {
      const media = (data as Record<string, unknown>).media as Record<string, unknown>
      if (typeof media.image === 'string') imageUrl = media.image as string
    }

    // generator url
    let generatorUrlValue: string = `https://generator.artblocks.io/${encodeURIComponent(tokenId)}`
    if (typeof (data as Record<string, unknown>).animation_url === 'string') generatorUrlValue = (data as Record<string, unknown>).animation_url as string
    else if (typeof (data as Record<string, unknown>).generator_url === 'string') generatorUrlValue = (data as Record<string, unknown>).generator_url as string
    else if (typeof (data as Record<string, unknown>).generatorUrl === 'string') generatorUrlValue = (data as Record<string, unknown>).generatorUrl as string

    // owner
    let collectorAddress: string | undefined = undefined
    if (typeof (data as Record<string, unknown>).owner === 'string') collectorAddress = (data as Record<string, unknown>).owner as string
    else if (typeof (data as Record<string, unknown>).owner_address === 'string') collectorAddress = (data as Record<string, unknown>).owner_address as string
    else if (typeof (data as Record<string, unknown>).ownerAddress === 'string') collectorAddress = (data as Record<string, unknown>).ownerAddress as string

    // contract from payload if present
    let contractAddress: string | undefined = undefined
    if (typeof (data as Record<string, unknown>).contract === 'string') contractAddress = (data as Record<string, unknown>).contract as string
    else if (typeof (data as Record<string, unknown>).contractAddress === 'string') contractAddress = (data as Record<string, unknown>).contractAddress as string
    else if (projectField && typeof projectField === 'object') {
      const po = projectField as Record<string, unknown>
      if (typeof po.contract === 'string') contractAddress = po.contract
    }

    const result: SearchResult = { tokenId, projectName, artist, imageUrl, generatorUrl: generatorUrlValue, collectorAddress, contractAddress }
    return result
  } catch {
    return {
      tokenId,
      imageUrl: `https://media.artblocks.io/${encodeURIComponent(tokenId)}.png`,
      generatorUrl: `https://generator.artblocks.io/${encodeURIComponent(tokenId)}`,
    }
  }
}

// searchTokensByGraphQLAll is now provided by lib/ab

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tokenRefs, setTokenRefs] = useState<Array<{ tokenId: string, contractAddress?: string }>>([])
  const [metadataMap, setMetadataMap] = useState<Record<string, SearchResult>>({})
  const [visibleCount, setVisibleCount] = useState(24)
  const [artistList, setArtistList] = useState<Array<{ name: string; total: number }>>([])
  const [projectList, setProjectList] = useState<Array<{ name: string; artist?: string | null; total: number; imageUrl?: string }>>([])
  const [collectorList, setCollectorList] = useState<Array<{ address: string; displayName?: string | null; total: number }>>([])
  const [loading, setLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const searchType = searchParams.get('type') || 'artist'
  const searchQuery = searchParams.get('query') || ''
  // Counts are derived from list lengths for non-token modes

  // Local search controls
  const [typeInput, setTypeInput] = useState(searchType)
  const [queryInput, setQueryInput] = useState(searchQuery)
  const handleSearch = () => {
    const params = new URLSearchParams({ type: typeInput, query: queryInput })
    router.push(`/search?${params.toString()}`)
  }

  // Selection persisted in localStorage
  type CartItem = { type: 'artist' | 'project' | 'collector' | 'token', value: string }
  const CART_KEY = 'abg-cart'
  const [cart, setCart] = useState<CartItem[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as CartItem[]
        if (Array.isArray(arr)) setCart(arr)
      }
    } catch {}
  }, [])
  const persistCart = (next: CartItem[]) => {
    setCart(next)
    try { localStorage.setItem(CART_KEY, JSON.stringify(next)) } catch {}
  }
  const isInCart = (item: CartItem) => cart.some(ci => ci.type === item.type && ci.value === item.value)
  const addToSelection = (item: CartItem) => {
    if (isInCart(item)) return
    persistCart([...cart, item])
  }
  const removeFromSelection = (item: CartItem) => {
    persistCart(cart.filter(ci => !(ci.type === item.type && ci.value === item.value)))
  }
  const addAllToSelection = () => {
    const newItems: CartItem[] = []
    
    if (searchType === 'artist') {
      artistList.forEach(a => {
        const item: CartItem = { type: 'artist', value: a.name }
        if (!isInCart(item)) newItems.push(item)
      })
    } else if (searchType === 'project') {
      projectList.forEach(p => {
        const item: CartItem = { type: 'project', value: p.name }
        if (!isInCart(item)) newItems.push(item)
      })
    } else if (searchType === 'collector') {
      collectorList.forEach(c => {
        const item: CartItem = { type: 'collector', value: c.address }
        if (!isInCart(item)) newItems.push(item)
      })
    } else if (searchType === 'token') {
      tokenRefs.forEach(r => {
        const item: CartItem = { type: 'token', value: r.tokenId }
        if (!isInCart(item)) newItems.push(item)
      })
    }
    
    if (newItems.length > 0) {
      persistCart([...cart, ...newItems])
    }
  }
  const startFromCart = () => {
    if (cart.length === 0) return
    // Build selection param instead of relying on localStorage
    const selectionParam = serializeSelection(cart)
    const qs = new URLSearchParams({
      selection: selectionParam,
      duration: '30',
      autoPlay: 'true',
      showInfo: 'true',
      randomOrder: 'false',
      showBorder: 'false',
      fullscreen: 'true', // Start in fullscreen by default
    })
    router.push(`/gallery/player?${qs.toString()}`)
  }
  // Selection totals
  const [selectionTotal, setSelectionTotal] = useState<number>(0)
  const [selectionLoading, setSelectionLoading] = useState<boolean>(false)
  useEffect(() => {
    let cancelled = false
    async function recompute() {
      setSelectionLoading(true)
      try {
        const unique = new Set<string>()
        // explicit tokens
        cart.filter(i => i.type === 'token').forEach(i => unique.add(i.value))
        // process categories sequentially to avoid overwhelming API
        for (const item of cart) {
          if (item.type === 'artist') {
            const rows = await searchTokensByGraphQLAll('artist', item.value, 100000)
            if (cancelled) return
            rows.forEach(r => unique.add(r.tokenId))
          } else if (item.type === 'project') {
            const rows = await searchTokensByGraphQLAll('project', item.value, 100000)
            if (cancelled) return
            rows.forEach(r => unique.add(r.tokenId))
          } else if (item.type === 'collector') {
            const rows = await searchTokensByGraphQLAll('collector', item.value, 100000)
            if (cancelled) return
            rows.forEach(r => unique.add(r.tokenId))
          }
        }
        setSelectionTotal(unique.size)
      } finally {
        if (!cancelled) setSelectionLoading(false)
      }
    }
    recompute()
    return () => { cancelled = true }
  }, [cart])

  // Debounced search effect
  useEffect(() => {
    const controller = new AbortController()
    
    // Debounce search by 300ms, except for token type (immediate)
    const delay = searchType === 'token' ? 0 : 300
    
    const timeoutId = setTimeout(() => {
      const searchNFTs = async () => {
        if (controller.signal.aborted) return
        
        setLoading(true)
        try {
          setVisibleCount(24)
          setMetadataMap({})
          setArtistList([])
          setProjectList([])
          setCollectorList([])
          
          if (searchType === 'token') {
            const rawInputs = searchQuery.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
            const tokenRefs: Array<{ tokenId: string; contractAddress?: string }> = []
            
            for (const input of rawInputs) {
              // Parse Art Blocks URL to extract token information
              const urlParsed = parseArtBlocksUrl(input)
              if (urlParsed) {
                tokenRefs.push({
                  tokenId: urlParsed.tokenId,
                  contractAddress: urlParsed.contractAddress
                })
              }
              // Only add tokens that were successfully parsed from URLs
            }
            
            setTokenRefs(tokenRefs)
          } else if (searchType === 'artist') {
            // Show artist search results, not tokens
            setTokenRefs([])
            const term = searchQuery.trim()
            if (!term) {
              setArtistList([])
            } else {
              const names = await searchArtistsDistinct(term)
              if (controller.signal.aborted) return
              
              if (!Array.isArray(names) || names.length === 0) {
                setArtistList([])
              } else {
                // fetch counts per artist
                const counts: number[] = []
                for (const n of names) {
                  if (controller.signal.aborted) return
                  const q = `
                    query CountByArtist($name: String!) {
                      tokens_metadata_aggregate(where: { project: { artist_name: { _eq: $name } } }) { aggregate { count } }
                    }
                  `
                  const d = await graphqlRequest<{ tokens_metadata_aggregate?: { aggregate?: { count?: number } } }>(q, { name: n })
                  const c = d?.tokens_metadata_aggregate?.aggregate?.count
                  counts.push(typeof c === 'number' ? c : 0)
                }
                if (!controller.signal.aborted) {
                  setArtistList(names.map((n, i) => ({ name: n, total: counts[i] || 0 })))
                }
              }
            }
          } else if (searchType === 'project') {
            setTokenRefs([])
            const q = `
              query ProjectsByName($value: String!) {
                projects_metadata(where: { name: { _ilike: $value } }, order_by: { name: asc }) {
                  name
                  artist_name
                  invocations
                }
              }
            `
            const data = await graphqlRequest<{ projects_metadata?: Array<Record<string, unknown>> }>(q, { value: `%${searchQuery}%` })
            if (controller.signal.aborted) return
            
            const list = data?.projects_metadata
            if (Array.isArray(list)) {
              const mapped = list.map((p) => ({
                name: typeof p?.name === 'string' ? (p.name as string) : '',
                artist: typeof p?.artist_name === 'string' ? (p.artist_name as string) : null,
                total: typeof p?.invocations === 'number' ? (p.invocations as number) : 0,
              })).filter(p => p.name)
              
              // Fetch preview images for each project
              const projectsWithImages = await Promise.all(
                mapped.map(async (project) => {
                  if (controller.signal.aborted) return project
                  
                  const imageQuery = `
                    query FirstTokenInProject($projectName: String!) {
                      tokens_metadata(
                        where: { project_name: { _eq: $projectName } },
                        order_by: { invocation: asc },
                        limit: 1
                      ) {
                        preview_asset_url
                        token_id
                        contract_address
                      }
                    }
                  `
                  const imageData = await graphqlRequest<{ tokens_metadata?: Array<Record<string, unknown>> }>(imageQuery, { projectName: project.name })
                  const firstToken = imageData?.tokens_metadata?.[0]
                  
                  let imageUrl: string | undefined = undefined
                  if (firstToken) {
                    const previewUrl = firstToken.preview_asset_url
                    const tokenId = firstToken.token_id
                    const contractAddress = firstToken.contract_address
                    
                    if (typeof previewUrl === 'string' && previewUrl) {
                      imageUrl = previewUrl
                    } else if (typeof tokenId === 'string') {
                      // Fallback to composed media URL
                      imageUrl = composeMediaUrl(tokenId, typeof contractAddress === 'string' ? contractAddress : undefined)
                    }
                  }
                  
                  return { ...project, imageUrl }
                })
              )
              
              if (!controller.signal.aborted) {
                setProjectList(projectsWithImages)
              }
            } else {
              setProjectList([])
            }
          } else if (searchType === 'collector') {
            setTokenRefs([])
            const term = searchQuery.trim()
            if (!term) {
              setCollectorList([])
            } else {
              // Check if term is an ENS name and resolve it
              let searchValue = term
              let resolvedAddress: string | null = null
              
              if (isEnsName(term)) {
                resolvedAddress = await resolveEnsToAddress(term)
                if (resolvedAddress) {
                  searchValue = resolvedAddress
                }
              }
              
              // Build query based on whether we have an address or search term
              const isAddress = isEthAddress(searchValue)
              const uq = isAddress 
                ? `
                  query U($value: String!) {
                    users(where: { public_address: { _eq: $value } }, order_by: { display_name: asc }, limit: 50) {
                      display_name
                      public_address
                    }
                  }
                `
                : `
                  query U($value: String!) {
                    users(where: { _or: [
                      { display_name: { _ilike: $value } },
                      { public_address: { _ilike: $value } }
                    ] }, order_by: { display_name: asc }, limit: 50) {
                      display_name
                      public_address
                    }
                  }
                `
              
              const queryValue = isAddress ? searchValue.toLowerCase() : `%${searchValue}%`
              const ures = await graphqlRequest<{ users?: Array<Record<string, unknown>> }>(uq, { value: queryValue })
              if (controller.signal.aborted) return
              
              const users = ures?.users
              if (Array.isArray(users) && users.length > 0) {
                // Extract all addresses for batch query
                const addresses: string[] = []
                const userMap = new Map<string, { displayName?: string | null }>()
                
                for (const u of users) {
                  const address = typeof u?.public_address === 'string' ? (u.public_address as string).toLowerCase() : ''
                  if (!address) continue
                  addresses.push(address)
                  const displayName = typeof u?.display_name === 'string' ? (u.display_name as string) : null
                  userMap.set(address, { displayName })
                }
                
                if (addresses.length > 0) {
                  // Use parallel queries for better performance
                  const countPromises = addresses.map(async (address) => {
                    const cq = `
                      query C($owner: String!) { 
                        tokens_metadata_aggregate(where: { owner_address: { _eq: $owner } }) { 
                          aggregate { count } 
                        } 
                      }
                    `
                    const cres = await graphqlRequest<{ tokens_metadata_aggregate?: { aggregate?: { count?: number } } }>(cq, { owner: address })
                    const cnt = cres?.tokens_metadata_aggregate?.aggregate?.count
                    return { address, count: typeof cnt === 'number' ? cnt : 0 }
                  })
                  
                  const counts = await Promise.all(countPromises)
                  if (controller.signal.aborted) return
                  
                  // Build result with counts
                  const result: Array<{ address: string; displayName?: string | null; total: number }> = []
                  for (const { address, count } of counts) {
                    if (count > 0) {
                      const user = userMap.get(address)
                      result.push({ address, displayName: user?.displayName, total: count })
                    }
                  }
                  
                  // Sort by total descending
                  result.sort((a, b) => b.total - a.total)
                  setCollectorList(result)
                } else {
                  setCollectorList([])
                }
              } else if (resolvedAddress) {
                // If ENS resolved but user not in database, still check if they own tokens
                const cq = `
                  query C($owner: String!) { tokens_metadata_aggregate(where: { owner_address: { _eq: $owner } }) { aggregate { count } } }
                `
                const cres = await graphqlRequest<{ tokens_metadata_aggregate?: { aggregate?: { count?: number } } }>(cq, { owner: resolvedAddress.toLowerCase() })
                if (!controller.signal.aborted) {
                  const cnt = cres?.tokens_metadata_aggregate?.aggregate?.count
                  const total = typeof cnt === 'number' ? cnt : 0
                  if (total > 0) {
                    // Show the ENS name as display name since it resolved
                    setCollectorList([{ address: resolvedAddress.toLowerCase(), displayName: term, total }])
                  } else {
                    setCollectorList([])
                  }
                }
              } else {
                setCollectorList([])
              }
            }
          } else {
            setTokenRefs([])
            setProjectList([])
            setCollectorList([])
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false)
          }
        }
      }

      searchNFTs()
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchType, searchQuery])

  // Fetch metadata for visible range lazily
  useEffect(() => {
    if (tokenRefs.length === 0) return
    const controller = new AbortController()
    const signal = controller.signal
    const start = 0
    const end = Math.min(visibleCount, tokenRefs.length)
    const slice = tokenRefs.slice(start, end)
    const missing = slice.filter(r => !(r.tokenId in metadataMap))
    if (missing.length === 0) return
    ;(async () => {
      const items = await Promise.all(
        missing.map((r) => fetchTokenMetadata(r.tokenId, signal, r.contractAddress))
      )
      const next: Record<string, SearchResult> = { ...metadataMap }
      for (const it of items) {
        if (it) next[it.tokenId] = it
      }
      setMetadataMap(next)
    })()
    return () => controller.abort()
  }, [tokenRefs, visibleCount, metadataMap])

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first?.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 24, tokenRefs.length))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [tokenRefs.length])

  // Slideshow start removed from results; use Selection bar instead

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </div>
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Searching Art Blocks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Inline search controls + cart */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-3">
            <Select value={typeInput} onValueChange={setTypeInput}>
              <SelectTrigger className="w-40 border-gray-300 rounded-none text-gray-900 font-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="token">Token URL</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="project">Collection</SelectItem>
                <SelectItem value="collector">Collector</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              placeholder={
                typeInput === 'token' ? 'Paste Art Blocks token URL...' :
                typeInput === 'artist' ? 'Search artists...' :
                typeInput === 'project' ? 'Search collections...' :
                'Search collectors...'
              }
              className="flex-1 border-gray-300 rounded-none text-gray-900 font-light"
            />
            <Button onClick={handleSearch} className="bg-gray-900 hover:bg-gray-800 rounded-none">Search</Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Selection: {cart.length} item{cart.length === 1 ? '' : 's'}{selectionLoading ? ' · computing…' : selectionTotal > 0 ? ` · ${selectionTotal} tokens` : ''}</div>
              <div className="flex gap-2">
                <Button onClick={startFromCart} className="bg-gray-900 hover:bg-gray-800 rounded-none" disabled={cart.length === 0}>
                  Start Gallery {selectionLoading ? '' : selectionTotal > 0 ? `(${selectionTotal})` : ''}
                </Button>
              </div>
            </div>
            {cart.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cart.map((item) => (
                  <span key={`${item.type}:${item.value}`} className="inline-flex items-center gap-2 bg-gray-200 text-gray-800 rounded-full px-3 py-1 text-xs">
                    <span className="uppercase tracking-wide text-[10px] text-gray-600">{item.type}</span>
                    <span className="font-mono">{item.value}</span>
                    <button
                      className="ml-1 rounded-full w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-900"
                      aria-label="Remove"
                      onClick={() => removeFromSelection(item)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 font-light">
                ← Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-light text-gray-900">Search Results</h1>
              <p className="text-gray-600 font-light mt-1">
                {searchType === 'artist' && `${artistList.length} ${artistList.length === 1 ? 'artist' : 'artists'} found`}
                {searchType === 'project' && `${projectList.length} ${projectList.length === 1 ? 'collection' : 'collections'} found`}
                {searchType === 'collector' && `${collectorList.length} ${collectorList.length === 1 ? 'collector' : 'collectors'} found`}
                {searchType === 'token' && `${tokenRefs.length} ${tokenRefs.length === 1 ? 'token' : 'tokens'} found`}
              </p>
            </div>
          </div>
          
          {/* Add All button */}
          {((searchType === 'artist' && artistList.length > 0) ||
            (searchType === 'project' && projectList.length > 0) ||
            (searchType === 'collector' && collectorList.length > 0) ||
            (searchType === 'token' && tokenRefs.length > 0)) && (
            <Button 
              variant="outline" 
              className="rounded-none"
              onClick={addAllToSelection}
            >
              Add All to Selection
            </Button>
          )}
        </div>

          {tokenRefs.length === 0 && !(searchType === 'artist' && artistList.length > 0) && !(searchType === 'project' && projectList.length > 0) && !(searchType === 'collector' && collectorList.length > 0) ? (
          <div className="text-center py-24">
            <p className="text-gray-600 font-light text-lg">No results found</p>
              <p className="text-gray-500 font-light text-sm mt-2">
                {searchType === 'token' ? 'Try pasting a valid Art Blocks token URL (you can input comma-separated URLs).' : 'Try refining your search.'}
              </p>
          </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {searchType === 'artist' && artistList.length > 0 ? (
              artistList.map((a) => (
                <div key={a.name} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-8">
                      <h3 className="font-light text-gray-900 text-xl mb-2">{a.name}</h3>
                      <p className="text-gray-600 font-light">{a.total} tokens</p>
                      <div className="mt-4">
                        <Button variant="outline" className="rounded-none" onClick={() => addToSelection({ type: 'artist', value: a.name })} disabled={isInCart({ type: 'artist', value: a.name })}>
                          {isInCart({ type: 'artist', value: a.name }) ? 'Added' : 'Add to Selection'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : searchType === 'project' && projectList.length > 0 ? (
              projectList.map((p) => (
                <div key={`${p.name}-${p.artist ?? ''}`} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {p.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={p.imageUrl}
                        alt={`${p.name} collection preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center p-8">
                          <h3 className="font-light text-gray-600 text-lg">{p.name}</h3>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-light text-gray-900 text-lg mb-1">{p.name}</h3>
                    {p.artist && (<p className="text-gray-600 font-light text-sm mb-3">{p.artist}</p>)}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-light">Tokens</span>
                        <span className="text-gray-700">{p.total}</span>
                      </div>
                      <div className="pt-2">
                        <Button variant="outline" className="rounded-none" onClick={() => addToSelection({ type: 'project', value: p.name })} disabled={isInCart({ type: 'project', value: p.name })}>
                          {isInCart({ type: 'project', value: p.name }) ? 'Added' : 'Add to Selection'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : searchType === 'collector' && collectorList.length > 0 ? (
              collectorList.map((c) => (
                <div key={c.address} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-8">
                      <h3 className="font-light text-gray-900 text-xl mb-2">{c.displayName ?? c.address}</h3>
                      <p className="text-gray-600 font-light text-xs">{c.address}</p>
                      <p className="text-gray-600 font-light">{c.total} tokens</p>
                      <div className="mt-4">
                        <Button variant="outline" className="rounded-none" onClick={() => addToSelection({ type: 'collector', value: c.address })} disabled={isInCart({ type: 'collector', value: c.address })}>
                          {isInCart({ type: 'collector', value: c.address }) ? 'Added' : 'Add to Selection'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : tokenRefs.slice(0, visibleCount).map((ref) => {
              const nft = metadataMap[ref.tokenId] ?? {
                tokenId: ref.tokenId,
                imageUrl: composeMediaUrl(ref.tokenId, ref.contractAddress),
                generatorUrl: composeGeneratorUrl(ref.tokenId, ref.contractAddress),
              } as SearchResult
              return (
              <div key={ref.tokenId} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={nft.imageUrl || `https://media.artblocks.io/${ref.tokenId}.png`}
                    alt={`${nft.projectName ?? 'Art Blocks'} #${ref.tokenId}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  {nft.projectName && (
                  <h3 className="font-light text-gray-900 text-lg mb-1">
                    {nft.projectName}{nft.invocation ? ` #${nft.invocation}` : ''}
                  </h3>
                  )}
                  {nft.artist && (
                  <p className="text-gray-600 font-light text-sm mb-3">{nft.artist}</p>
                  )}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-light">Token</span>
                      <span className="text-gray-700 font-mono">#{ref.tokenId}</span>
                    </div>
                    {nft.collectorAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-light">Owner</span>
                        <span className="text-gray-700 font-mono text-xs">{truncateEthAddress(nft.collectorAddress)}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Button variant="outline" className="rounded-none" onClick={() => addToSelection({ type: 'token', value: ref.tokenId })} disabled={isInCart({ type: 'token', value: ref.tokenId })}>
                        {isInCart({ type: 'token', value: ref.tokenId }) ? 'Added' : 'Add to Selection'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
            <div ref={sentinelRef} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  )
}
