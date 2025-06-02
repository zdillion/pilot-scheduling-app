import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get("userRole")

    let schedules

    if (userRole === "manager") {
      // Managers see all schedules
      schedules = await sql`
        SELECT id, month, year, shifts_per_day, is_published, version, created_by, created_at
        FROM monthly_schedules
        ORDER BY year DESC, month DESC
      `
    } else {
      // Non-managers only see published schedules
      schedules = await sql`
        SELECT id, month, year, shifts_per_day, is_published, version, created_by, created_at
        FROM monthly_schedules
        WHERE is_published = true
        ORDER BY year DESC, month DESC
      `
    }

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { month, year, shifts_per_day, created_by } = await request.json()

    // Check if schedule already exists for this month/year
    const existingSchedule = await sql`
      SELECT id FROM monthly_schedules 
      WHERE month = ${month} AND year = ${year}
    `

    if (existingSchedule.length > 0) {
      return NextResponse.json({ message: "A schedule for this month already exists" }, { status: 400 })
    }

    // Create new schedule with version 0 (draft)
    const result = await sql`
      INSERT INTO monthly_schedules (month, year, shifts_per_day, created_by, is_published, version)
      VALUES (${month}, ${year}, ${shifts_per_day}, ${created_by}, false, 0)
      RETURNING id, month, year, shifts_per_day, is_published, version
    `

    const scheduleId = result[0].id

    // Create default shift definitions (A, B, C, etc.)
    const shiftLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

    for (let i = 0; i < shifts_per_day; i++) {
      await sql`
        INSERT INTO shift_definitions (schedule_id, shift_letter, start_time, duration_hours, pilots_required)
        VALUES (${scheduleId}, ${shiftLetters[i]}, '08:00', 8, 2)
      `
    }

    return NextResponse.json({
      message: "Schedule created successfully",
      schedule: result[0],
    })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
