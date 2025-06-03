"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Settings, Home, CalendarDays, Cog, ArrowLeftRight, Plane, Menu } from "lucide-react"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
}

export default function OptionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")

      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1>Loading user data...</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-black shadow-sm border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-semibold text-white">Options</h1>
            <div className="flex-1 flex justify-center">
              <span className="text-sm text-gray-300">Welcome, {user.first_name}</span>
            </div>
            <div className="flex items-center space-x-4">
              {user.role === "manager" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/manager")}
                  className="bg-black border-white text-white hover:bg-white hover:text-black"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manager
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-black border-white text-white hover:bg-white hover:text-black"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Toggle */}
      <div className="md:hidden bg-black border-b border-white p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-full bg-black border-white text-white hover:bg-white hover:text-black"
        >
          <Menu className="w-4 h-4 mr-2" />
          {mobileMenuOpen ? "Hide Menu" : "Show Menu"}
        </Button>
      </div>

      {/* Navigation Links - Desktop (always visible) and Mobile (toggleable) */}
      <nav className={`bg-black border-b border-white ${mobileMenuOpen ? "block" : "hidden"} md:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:space-x-8">
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              onClick={() => router.push("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              onClick={() => router.push("/schedule/view")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800 justify-start"
            >
              <Cog className="w-4 h-4 mr-2" />
              Options
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              disabled
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Trades
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              disabled
            >
              <Plane className="w-4 h-4 mr-2" />
              Time Off
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PWA Installation Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">Install App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install this app on your device for a better experience and offline access.
              </p>
              <div id="pwa-installer-container">{/* PWA installer will be rendered here */}</div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                Enable push notifications to receive updates about schedule changes.
              </p>
              <div id="pwa-notification-toggle-container">{/* PWA notification toggle will be rendered here */}</div>
            </CardContent>
          </Card>

          {/* Profile Information Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-300">Name: </span>
                <span className="text-white">
                  {user.first_name} {user.last_name}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">Username: </span>
                <span className="text-white">{user.username}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">Role: </span>
                <span className="text-white capitalize">{user.role}</span>
              </div>
            </CardContent>
          </Card>

          {/* App Information Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">App Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-300">Version: </span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">Last Updated: </span>
                <span className="text-white">December 2024</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">Platform: </span>
                <span className="text-white">Web App</span>
              </div>
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">Need help? Contact your system administrator or IT support.</p>
              <Button
                variant="outline"
                className="w-full bg-black border-white text-white hover:bg-white hover:text-black"
                disabled
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Data & Privacy Card */}
          <Card className="bg-black border-white">
            <CardHeader>
              <CardTitle className="text-white">Data & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                Your data is stored securely and used only for scheduling purposes.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-black border-white text-white hover:bg-white hover:text-black"
                  disabled
                >
                  View Privacy Policy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-black border-white text-white hover:bg-white hover:text-black"
                  disabled
                >
                  Export My Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* PWA Components - These will be dynamically loaded */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Dynamically load PWA components
            if (typeof window !== 'undefined') {
              // Load PWA installer
              import('/components/pwa-installer.tsx').then(module => {
                const PWAInstaller = module.default;
                const container = document.getElementById('pwa-installer-container');
                if (container && PWAInstaller) {
                  // Render PWA installer component
                  container.innerHTML = '<div>PWA Installer will be available here</div>';
                }
              }).catch(() => {
                // Fallback if PWA installer is not available
                const container = document.getElementById('pwa-installer-container');
                if (container) {
                  container.innerHTML = '<div class="text-gray-400 text-sm">PWA installation not available</div>';
                }
              });

              // Load PWA notification toggle
              import('/components/pwa-notification-toggle.tsx').then(module => {
                const PWANotificationToggle = module.default;
                const container = document.getElementById('pwa-notification-toggle-container');
                if (container && PWANotificationToggle) {
                  // Render PWA notification toggle component
                  container.innerHTML = '<div>Notification settings will be available here</div>';
                }
              }).catch(() => {
                // Fallback if PWA notification toggle is not available
                const container = document.getElementById('pwa-notification-toggle-container');
                if (container) {
                  container.innerHTML = '<div class="text-gray-400 text-sm">Notification settings not available</div>';
                }
              });
            }
          `,
        }}
      />
    </div>
  )
}
