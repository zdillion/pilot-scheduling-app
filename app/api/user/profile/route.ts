import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    // Fetch user contact information
    const users = await sql`
      SELECT id, username, first_name, last_name, email, phone
      FROM users 
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const user = users[0]

    // Fetch notification preferences
    const preferences = await sql`
      SELECT category, enabled, email_enabled, inapp_enabled, sms_enabled
      FROM notification_preferences
      WHERE user_id = ${userId}
    `

    // Fetch reminder timings
    const timings = await sql`
      SELECT hours_24, hours_2, minutes_30
      FROM reminder_timings
      WHERE user_id = ${userId}
    `

    // Format preferences for frontend
    const formattedPreferences = {
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
    }

    // Override with actual data if exists
    preferences.forEach((pref) => {
      if (pref.category === "new_schedule_published") {
        formattedPreferences.newSchedulePublished = {
          enabled: pref.enabled,
          email: pref.email_enabled,
          inApp: pref.inapp_enabled,
          sms: pref.sms_enabled,
        }
      } else if (pref.category === "schedule_changes") {
        formattedPreferences.scheduleChanges = {
          enabled: pref.enabled,
          email: pref.email_enabled,
          inApp: pref.inapp_enabled,
          sms: pref.sms_enabled,
        }
      } else if (pref.category === "shift_reminders") {
        formattedPreferences.shiftReminders = {
          enabled: pref.enabled,
          email: pref.email_enabled,
          inApp: pref.inapp_enabled,
          sms: pref.sms_enabled,
          timing: formattedPreferences.shiftReminders.timing,
        }
      }
    })

    // Override timing data if exists
    if (timings.length > 0) {
      formattedPreferences.shiftReminders.timing = {
        hours24: timings[0].hours_24,
        hours2: timings[0].hours_2,
        minutes30: timings[0].minutes_30,
      }
    }

    return NextResponse.json({
      contactInfo: {
        email: user.email || "",
        phone: user.phone || "",
      },
      preferences: formattedPreferences,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const { contactInfo, preferences } = await request.json()

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    // Update user contact information
    await sql`
      UPDATE users 
      SET email = ${contactInfo.email}, phone = ${contactInfo.phone}
      WHERE id = ${userId}
    `

    // Update notification preferences
    const categories = [
      { key: "newSchedulePublished", dbKey: "new_schedule_published" },
      { key: "scheduleChanges", dbKey: "schedule_changes" },
      { key: "shiftReminders", dbKey: "shift_reminders" },
    ]

    for (const category of categories) {
      const pref = preferences[category.key]
      await sql`
        INSERT INTO notification_preferences (user_id, category, enabled, email_enabled, inapp_enabled, sms_enabled)
        VALUES (${userId}, ${category.dbKey}, ${pref.enabled}, ${pref.email}, ${pref.inApp}, ${pref.sms})
        ON CONFLICT (user_id, category)
        DO UPDATE SET 
          enabled = ${pref.enabled},
          email_enabled = ${pref.email},
          inapp_enabled = ${pref.inApp},
          sms_enabled = ${pref.sms},
          updated_at = CURRENT_TIMESTAMP
      `
    }

    // Update reminder timings
    if (preferences.shiftReminders.timing) {
      const timing = preferences.shiftReminders.timing
      await sql`
        INSERT INTO reminder_timings (user_id, hours_24, hours_2, minutes_30)
        VALUES (${userId}, ${timing.hours24}, ${timing.hours2}, ${timing.minutes30})
        ON CONFLICT (user_id)
        DO UPDATE SET 
          hours_24 = ${timing.hours24},
          hours_2 = ${timing.hours2},
          minutes_30 = ${timing.minutes30},
          updated_at = CURRENT_TIMESTAMP
      `
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      contactInfo,
      preferences,
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
