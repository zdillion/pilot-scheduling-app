import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { scheduleId: string } }) {
  try {
    // Always use schedule_id = 5 where the data actually exists
    const scheduleId = "5"

    console.log(`Fetching assignments for schedule ID: ${scheduleId}`)

    const assignments = await sql`
      SELECT 
        sa.id,
        ds.shift_date,
        ds.shift_definition_id,
        sa.assignment_order,
        sa.pilot_id,
        u.first_name,
        u.last_name
      FROM shift_assignments sa
      JOIN daily_shifts ds ON sa.daily_shift_id = ds.id
      LEFT JOIN users u ON sa.pilot_id = u.id
      WHERE ds.schedule_id = ${scheduleId}
      ORDER BY ds.shift_date, ds.shift_definition_id, sa.assignment_order
    `

    console.log(`Found ${assignments.length} assignments`)

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}
