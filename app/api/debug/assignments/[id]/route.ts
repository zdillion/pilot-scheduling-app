import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    // Get all daily shifts
    const dailyShifts = await sql`
      SELECT id, schedule_id, shift_definition_id, shift_date
      FROM daily_shifts
      WHERE schedule_id = ${scheduleId}
      ORDER BY shift_date, shift_definition_id
    `

    // Get all shift assignments
    const shiftAssignments = await sql`
      SELECT sa.id, sa.daily_shift_id, sa.pilot_id, sa.assignment_order, 
             ds.shift_date, ds.shift_definition_id,
             COALESCE(u.first_name, 'Unknown') as first_name,
             COALESCE(u.last_name, 'Pilot') as last_name
      FROM shift_assignments sa
      JOIN daily_shifts ds ON sa.daily_shift_id = ds.id
      LEFT JOIN users u ON sa.pilot_id = u.id AND sa.pilot_id != 0
      WHERE ds.schedule_id = ${scheduleId}
      ORDER BY ds.shift_date, ds.shift_definition_id, sa.assignment_order
    `

    // Get all training days
    const trainingDays = await sql`
      SELECT id, schedule_id, training_date
      FROM training_days
      WHERE schedule_id = ${scheduleId}
      ORDER BY training_date
    `

    // Get all training assignments
    const trainingAssignments = await sql`
      SELECT ta.id, ta.schedule_id, ta.training_day_id, ta.pilot_id, ta.assignment_order, 
             ta.training_date,
             COALESCE(u.first_name, 'Unknown') as first_name,
             COALESCE(u.last_name, 'Pilot') as last_name
      FROM training_assignments ta
      LEFT JOIN users u ON ta.pilot_id = u.id AND ta.pilot_id != 0
      WHERE ta.schedule_id = ${scheduleId}
      ORDER BY ta.training_date, ta.assignment_order
    `.catch(() => []) // Handle case where table doesn't exist yet

    return NextResponse.json({
      dailyShifts,
      shiftAssignments,
      trainingDays,
      trainingAssignments,
    })
  } catch (error) {
    console.error("Error fetching debug assignments:", error)
    return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 })
  }
}
