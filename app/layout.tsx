import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
// ThemeProvider removed (no implementation present)

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Art Blocks Explorer",
  description: "Discover and view generative art NFTs with an immersive slideshow experience",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
