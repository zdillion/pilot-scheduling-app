import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get("scheduleId")

    if (!scheduleId) {
      return NextResponse.json({ error: "Schedule ID required" }, { status: 400 })
    }

    console.log("Fetching PUBLISHED assignments for schedule ID:", scheduleId)

    // Get PUBLISHED shift assignments only
    const assignments = await sql`
      SELECT 
        ds.shift_date,
        ds.shift_definition_id,
        sa.assignment_order,
        sa.pilot_id,
        u.first_name,
        u.last_name
      FROM daily_shifts ds
      JOIN shift_assignments sa ON ds.id = sa.daily_shift_id
      JOIN users u ON sa.pilot_id = u.id
      JOIN monthly_schedules ms ON ds.schedule_id = ms.id
      WHERE ds.schedule_id = ${scheduleId} 
      AND ms.is_published = true
      ORDER BY ds.shift_date, ds.shift_definition_id, sa.assignment_order
    `

    console.log("Found PUBLISHED assignments:", assignments.length)
    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching published assignments:", error)
    return NextResponse.json({ error: "Failed to fetch published assignments" }, { status: 500 })
  }
}
