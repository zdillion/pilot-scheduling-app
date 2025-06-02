import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    // First, delete related data (shift assignments, daily shifts, shift definitions, training days)
    await sql`DELETE FROM shift_assignments WHERE daily_shift_id IN (SELECT id FROM daily_shifts WHERE schedule_id = ${scheduleId})`
    await sql`DELETE FROM daily_shifts WHERE schedule_id = ${scheduleId}`
    await sql`DELETE FROM shift_definitions WHERE schedule_id = ${scheduleId}`
    await sql`DELETE FROM training_days WHERE schedule_id = ${scheduleId}`

    // Finally, delete the schedule itself
    const result = await sql`
      DELETE FROM monthly_schedules 
      WHERE id = ${scheduleId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Schedule deleted successfully" })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
