import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string; shiftId: string } }) {
  try {
    const scheduleId = params.id
    const shiftId = params.shiftId
    const { shift_letter, start_time, duration_hours, pilots_required } = await request.json()

    if (!shift_letter || !start_time) {
      return NextResponse.json({ message: "Shift letter and start time are required" }, { status: 400 })
    }

    // Validate and format the start_time
    let formattedTime = start_time

    // If it's a 4-digit string like "0000", convert to "00:00"
    if (/^\d{4}$/.test(start_time)) {
      const hours = start_time.substring(0, 2)
      const minutes = start_time.substring(2, 4)
      formattedTime = `${hours}:${minutes}`
    }

    // If it's a single digit or invalid format, reject it
    if (!/^\d{2}:\d{2}$/.test(formattedTime)) {
      return NextResponse.json({ message: "Invalid time format. Use HH:MM or HHMM" }, { status: 400 })
    }

    // Check if shift letter already exists for this schedule (excluding current shift)
    const existingShifts = await sql`
      SELECT id FROM shift_definitions 
      WHERE schedule_id = ${scheduleId} AND shift_letter = ${shift_letter} AND id != ${shiftId}
    `

    if (existingShifts.length > 0) {
      return NextResponse.json(
        { message: "A shift with this letter already exists for this schedule" },
        { status: 400 },
      )
    }

    const result = await sql`
      UPDATE shift_definitions 
      SET shift_letter = ${shift_letter}, start_time = ${formattedTime}, 
          duration_hours = ${duration_hours}, pilots_required = ${pilots_required}
      WHERE id = ${shiftId} AND schedule_id = ${scheduleId}
      RETURNING id, schedule_id, shift_letter, start_time, duration_hours, pilots_required
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Shift definition not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Shift definition updated successfully",
      shiftDefinition: result[0],
    })
  } catch (error) {
    console.error("Error updating shift definition:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; shiftId: string } }) {
  try {
    const scheduleId = params.id
    const shiftId = params.shiftId

    // First, delete related daily shifts and assignments
    await sql`
      DELETE FROM shift_assignments 
      WHERE daily_shift_id IN (
        SELECT id FROM daily_shifts 
        WHERE schedule_id = ${scheduleId} AND shift_definition_id = ${shiftId}
      )
    `

    await sql`
      DELETE FROM daily_shifts 
      WHERE schedule_id = ${scheduleId} AND shift_definition_id = ${shiftId}
    `

    // Then delete the shift definition
    const result = await sql`
      DELETE FROM shift_definitions 
      WHERE id = ${shiftId} AND schedule_id = ${scheduleId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Shift definition not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Shift definition deleted successfully" })
  } catch (error) {
    console.error("Error deleting shift definition:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
