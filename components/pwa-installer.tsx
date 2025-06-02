"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, Bell } from "lucide-react"
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  isAppInstalled,
} from "@/lib/pwa-utils"

export function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showNotificationBanner, setShowNotificationBanner] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<string>("default")

  // Handle the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setInstallPrompt(e)

      // Only show the install banner if the app is not already installed
      if (!isAppInstalled()) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  // Check notification permission on mount
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (isPushNotificationSupported()) {
        const permission = Notification.permission
        setNotificationPermission(permission)

        // Show notification banner if permission is not granted and app is installed
        if (permission !== "granted" && isAppInstalled()) {
          setShowNotificationBanner(true)
        }
      }
    }

    checkNotificationPermission()
  }, [])

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      // Hide the install banner
      setShowInstallBanner(false)
      // Show the notification banner if needed
      if (notificationPermission !== "granted" && isPushNotificationSupported()) {
        setShowNotificationBanner(true)
      }
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [notificationPermission])

  // Install the app
  const installApp = async () => {
    if (!installPrompt) return

    // Show the install prompt
    installPrompt.prompt()

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice

    // Reset the install prompt
    setInstallPrompt(null)

    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt")
      setShowInstallBanner(false)
    } else {
      console.log("User dismissed the install prompt")
    }
  }

  // Enable notifications
  const enableNotifications = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)

    if (permission === "granted") {
      await subscribeToPushNotifications()
      setShowNotificationBanner(false)
    }
  }

  // Dismiss banners
  const dismissInstallBanner = () => setShowInstallBanner(false)
  const dismissNotificationBanner = () => setShowNotificationBanner(false)

  if (!showInstallBanner && !showNotificationBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {showInstallBanner && (
        <div className="bg-blue-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            <span>Install this app on your device for a better experience</span>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={installApp}
              className="mr-2 bg-transparent border-white text-white hover:bg-white hover:text-blue-900"
            >
              Install
            </Button>
            <Button variant="ghost" size="sm" onClick={dismissInstallBanner} className="text-white hover:bg-blue-800">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {showNotificationBanner && (
        <div className="bg-green-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            <span>Enable notifications to stay updated on schedule changes</span>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={enableNotifications}
              className="mr-2 bg-transparent border-white text-white hover:bg-white hover:text-green-900"
            >
              Enable
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissNotificationBanner}
              className="text-white hover:bg-green-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
