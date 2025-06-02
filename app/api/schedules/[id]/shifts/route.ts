import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    const shiftDefinitions = await sql`
      SELECT id, schedule_id, shift_letter, start_time, duration_hours, pilots_required
      FROM shift_definitions
      WHERE schedule_id = ${scheduleId}
      ORDER BY shift_letter
    `

    // Ensure we're returning the data in the expected format
    return NextResponse.json({ shiftDefinitions })
  } catch (error) {
    console.error("Error fetching shift definitions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { shift_letter, start_time, duration_hours, pilots_required } = await request.json()

    if (!shift_letter || !start_time) {
      return NextResponse.json({ message: "Shift letter and start time are required" }, { status: 400 })
    }

    // Check if shift letter already exists for this schedule
    const existingShifts = await sql`
      SELECT id FROM shift_definitions 
      WHERE schedule_id = ${scheduleId} AND shift_letter = ${shift_letter}
    `

    if (existingShifts.length > 0) {
      return NextResponse.json(
        { message: "A shift with this letter already exists for this schedule" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO shift_definitions (schedule_id, shift_letter, start_time, duration_hours, pilots_required)
      VALUES (${scheduleId}, ${shift_letter}, ${start_time}, ${duration_hours}, ${pilots_required})
      RETURNING id, schedule_id, shift_letter, start_time, duration_hours, pilots_required
    `

    return NextResponse.json({
      message: "Shift definition created successfully",
      shiftDefinition: result[0],
    })
  } catch (error) {
    console.error("Error creating shift definition:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
