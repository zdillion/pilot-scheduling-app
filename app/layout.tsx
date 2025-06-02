import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { PWAInstaller } from "@/components/pwa-installer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pilot Scheduling App",
  description: "Manage and view pilot schedules",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pilot Scheduling App",
  },
  viewport: {
    width: "1024",
    initialScale: .4,
    minimumScale: .1,
    maximumScale: 3.0,
    userScalable: true,
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        {children}
        <PWAInstaller />
      </body>
    </html>
  )
}
