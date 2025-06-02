// Server-side push notification utilities
// This file only runs on the server side

let webpush: any = null

// Dynamically import web-push only on server side
async function getWebPush() {
  if (!webpush) {
    webpush = await import("web-push")

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      "mailto:admin@yourpilotapp.com", // Change to your email
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
  }
  return webpush
}

export async function sendPushNotification(subscription: any, payload: string) {
  const webpush = await getWebPush()
  return webpush.sendNotification(subscription, payload)
}

export async function generateVapidKeys() {
  const webpush = await getWebPush()
  return webpush.generateVAPIDKeys()
}
