import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendPushNotification } from "@/lib/push-notifications"
import { getUserFromRequest } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

// Send a notification to a specific user
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    // Only managers can send notifications
    if (!user || user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, title, body, url } = await request.json()

    if (!userId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get all push subscriptions for the user
    const subscriptions = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `

    if (!subscriptions.length) {
      return NextResponse.json({ message: "No subscriptions found for user" })
    }

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        const payload = JSON.stringify({
          title,
          body,
          url: url || "/",
          timestamp: Date.now(),
        })

        return sendPushNotification(subscription, payload)
      }),
    )

    // Count successful and failed notifications
    const successful = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    return NextResponse.json({
      message: `Sent ${successful} notifications, ${failed} failed`,
      successful,
      failed,
    })
  } catch (error) {
    console.error("Error sending push notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
