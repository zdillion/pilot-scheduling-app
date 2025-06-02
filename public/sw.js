// Service Worker for Pilot Scheduling App

const CACHE_NAME = "pilot-app-cache-v1"
const urlsToCache = ["/", "/dashboard", "/schedule/view", "/options", "/offline.html"]

// Install event - cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  // Take control of all clients immediately
  self.clients.claim()
})

// Fetch event - serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          // Cache the response for future use
          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API requests
            if (!event.request.url.includes("/api/")) {
              cache.put(event.request, responseToCache)
            }
          })

          return response
        })
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html")
        }
      }),
  )
})

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || "New notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-96x96.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [],
    }

    event.waitUntil(self.registration.showNotification(data.title || "Pilot Scheduling App", options))
  } catch (error) {
    console.error("Error showing notification:", error)
  }
})

// Notification click event - open the app to the relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  // Get the notification data
  const urlToOpen = event.notification.data?.url || "/"

  // Open the app and navigate to the URL
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // If a window client is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          return client.navigate(urlToOpen)
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})
