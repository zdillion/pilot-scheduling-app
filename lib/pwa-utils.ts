// Client-side PWA utilities only
// Server-side push notification code moved to separate file

// Convert a base64 string to a Uint8Array
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Register the service worker
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      console.log("Service Worker registered with scope:", registration.scope)
      return registration
    } catch (error) {
      console.error("Service Worker registration failed:", error)
      return null
    }
  }
  return null
}

// Subscribe to push notifications
export async function subscribeToPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready

    // Get the server's public key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      throw new Error("VAPID public key not found")
    }

    // Convert the public key to the format expected by the browser
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe the user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    // Send the subscription to the server
    await fetch("/api/push-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    })

    return subscription
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Send the unsubscribe request to the server
      await fetch("/api/push-subscription", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      })

      // Unsubscribe on the client
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

// Check if push notifications are supported
export function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission === "denied") {
    return "denied"
  }

  try {
    const result = await Notification.requestPermission()
    return result
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return "denied"
  }
}

// Check if the app is installed (in standalone mode)
export function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
}
