import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    // Get all training days
    const trainingDays = await sql`
      SELECT id, schedule_id, training_date
      FROM training_days
      WHERE schedule_id = ${scheduleId}
      ORDER BY training_date
    `

    // Get all training assignments
    const trainingAssignments = await sql`
      SELECT ta.id, ta.training_day_id, ta.pilot_id, ta.assignment_order, 
             td.training_date, td.schedule_id,
             u.first_name, u.last_name
      FROM training_assignments ta
      JOIN training_days td ON ta.training_day_id = td.id
      LEFT JOIN users u ON ta.pilot_id = u.id
      WHERE td.schedule_id = ${scheduleId}
      ORDER BY td.training_date, ta.assignment_order
    `

    return NextResponse.json({
      trainingDays,
      trainingAssignments,
      message: "This is a debug endpoint to see what's in the database",
    })
  } catch (error) {
    console.error("Error fetching debug training data:", error)
    return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 })
  }
}
