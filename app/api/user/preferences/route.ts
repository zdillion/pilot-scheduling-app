import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    // For now, we'll return mock data
    // In a real implementation, you would fetch from the database
    return NextResponse.json({
      preferences: {
        newSchedulePublished: {
          enabled: true,
          email: true,
          inApp: true,
          sms: false,
        },
        scheduleChanges: {
          enabled: true,
          email: true,
          inApp: true,
          sms: false,
        },
        shiftReminders: {
          enabled: true,
          email: true,
          inApp: true,
          sms: false,
          timing: {
            hours24: true,
            hours2: true,
            minutes30: false,
          },
        },
      },
    })
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const { preferences } = await request.json()

    if (!userId || !preferences) {
      return NextResponse.json({ message: "User ID and preferences are required" }, { status: 400 })
    }

    // In a real implementation, you would save to the database
    // await sql`
    //   INSERT INTO user_preferences (user_id, preferences)
    //   VALUES (${userId}, ${JSON.stringify(preferences)})
    //   ON CONFLICT (user_id)
    //   DO UPDATE SET preferences = ${JSON.stringify(preferences)}
    // `

    return NextResponse.json({
      message: "Preferences saved successfully",
      preferences,
    })
  } catch (error) {
    console.error("Error saving notification preferences:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
