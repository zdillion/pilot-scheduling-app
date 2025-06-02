"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell } from "lucide-react"
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/pwa-utils"

interface PWANotificationToggleProps {
  onChange?: (enabled: boolean) => void
  defaultEnabled?: boolean
}

export function PWANotificationToggle({ onChange, defaultEnabled = false }: PWANotificationToggleProps) {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(defaultEnabled)
  const [permission, setPermission] = useState<string>("default")

  // Check if push notifications are supported
  useEffect(() => {
    setSupported(isPushNotificationSupported())

    if (isPushNotificationSupported()) {
      setPermission(Notification.permission)

      // Check if we have an active subscription
      const checkSubscription = async () => {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          setEnabled(!!subscription)
        }
      }

      checkSubscription()
    }
  }, [])

  // Handle toggle change
  const handleToggleChange = async (checked: boolean) => {
    if (!supported) return

    if (checked) {
      // Request permission if needed
      if (permission !== "granted") {
        const newPermission = await requestNotificationPermission()
        setPermission(newPermission)

        if (newPermission !== "granted") {
          return // Permission denied
        }
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications()
      const success = !!subscription
      setEnabled(success)
      onChange?.(success)
    } else {
      // Unsubscribe from push notifications
      const success = await unsubscribeFromPushNotifications()
      setEnabled(!success)
      onChange?.(!success)
    }
  }

  if (!supported) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="push-notifications"
        checked={enabled}
        onCheckedChange={handleToggleChange}
        disabled={permission === "denied"}
      />
      <Label htmlFor="push-notifications" className="text-white flex items-center">
        <Bell className="w-4 h-4 mr-2" />
        Push notifications
      </Label>
      {permission === "denied" && <span className="text-xs text-red-400 ml-2">(Blocked in browser settings)</span>}
    </div>
  )
}
