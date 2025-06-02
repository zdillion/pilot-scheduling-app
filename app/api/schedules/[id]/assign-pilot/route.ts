import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { shift_id, pilot_id, assignment_order, assigned_by } = await request.json()

    if (!pilot_id || !assignment_order) {
      return NextResponse.json({ message: "Pilot ID and assignment order are required" }, { status: 400 })
    }

    // If shift_id is provided, use it; otherwise we need to create the daily shift first
    const dailyShiftId = shift_id

    if (!dailyShiftId) {
      return NextResponse.json({ message: "Shift ID is required" }, { status: 400 })
    }

    // Check if this pilot is already assigned to this shift
    const existingAssignment = await sql`
      SELECT id FROM shift_assignments 
      WHERE daily_shift_id = ${dailyShiftId} AND pilot_id = ${pilot_id}
    `

    if (existingAssignment.length > 0) {
      return NextResponse.json({ message: "Pilot is already assigned to this shift" }, { status: 400 })
    }

    // Create the assignment
    const result = await sql`
      INSERT INTO shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by)
      VALUES (${dailyShiftId}, ${pilot_id}, ${assignment_order}, ${assigned_by})
      RETURNING id, daily_shift_id, pilot_id, assignment_order
    `

    return NextResponse.json({
      message: "Pilot assigned successfully",
      assignment: result[0],
    })
  } catch (error) {
    console.error("Error assigning pilot:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
