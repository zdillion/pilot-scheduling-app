import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { type, date, shiftId, trainingId, slotIndex } = await request.json()

    if (type === "shift") {
      // Handle shift assignment deletion from DRAFT table
      if (!shiftId || !date || slotIndex === undefined) {
        return NextResponse.json({ message: "Missing required fields for shift assignment deletion" }, { status: 400 })
      }

      // First, get the daily_shift_id
      const dailyShift = await sql`
        SELECT id FROM daily_shifts 
        WHERE schedule_id = ${scheduleId} AND shift_definition_id = ${shiftId} AND shift_date = ${date}
      `

      if (dailyShift.length === 0) {
        return NextResponse.json({ message: "Shift not found" }, { status: 404 })
      }

      const dailyShiftId = dailyShift[0].id

      // Delete the assignment from DRAFT table
      await sql`
        DELETE FROM draft_shift_assignments 
        WHERE daily_shift_id = ${dailyShiftId} AND assignment_order = ${slotIndex}
      `
    } else if (type === "training") {
      // Handle training assignment deletion from DRAFT table
      if (!trainingId || slotIndex === undefined) {
        return NextResponse.json(
          { message: "Missing required fields for training assignment deletion" },
          { status: 400 },
        )
      }

      // Delete the assignment from DRAFT table
      await sql`
        DELETE FROM draft_training_assignments 
        WHERE training_day_id = ${trainingId} AND assignment_order = ${slotIndex}
      `
    } else {
      return NextResponse.json({ message: "Invalid assignment type" }, { status: 400 })
    }

    return NextResponse.json({ message: "Draft assignment deleted successfully" })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
