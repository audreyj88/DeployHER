import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'
import './globals.css'

const brand = Bricolage_Grotesque({ subsets: ['latin'], weight: ['800'], variable: '--font-brand' })

export const metadata: Metadata = {
  title: 'DeployHER · Closing the gender gap in the AI economy',
  description: 'A playable AI-deployment apprenticeship in a walkable 3D campus.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1E4630',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={brand.variable}>
      <body>{children}</body>
    </html>
  )
}
