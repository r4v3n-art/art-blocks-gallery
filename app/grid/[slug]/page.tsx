"use client"

import { Suspense, use } from "react"
import { useSearchParams } from "next/navigation"
import { GridGallery } from "@/components/grid/GridGallery"
import "../global.css"

interface GridPageProps {
  params: Promise<{
    slug: string
  }>
}

function GridGalleryWrapper({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const columns = parseInt(searchParams.get('columns') || '10', 10)
  const rows = parseInt(searchParams.get('rows') || '10', 10)
  
  // Ensure reasonable limits
  const safeColumns = Math.min(Math.max(columns, 1), 50)
  const safeRows = Math.min(Math.max(rows, 1), 50)
  
  return (
    <GridGallery 
      slug={slug}
      columns={safeColumns}
      rows={safeRows}
    />
  )
}

export default function GridPage({ params }: GridPageProps) {
  const { slug } = use(params)

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <GridGalleryWrapper slug={slug} />
    </Suspense>
  )
}
