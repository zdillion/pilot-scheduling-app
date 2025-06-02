import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // Get basic user info
    const userInfo = userId
      ? await sql`
      SELECT id, username, first_name, last_name, role 
      FROM users 
      WHERE id = ${userId}
    `
      : []

    // Get published schedules
    const schedules = await sql`
      SELECT id, month, year, is_published 
      FROM monthly_schedules 
      WHERE is_published = true
      ORDER BY year DESC, month DESC
    `

    // Get sample assignments
    const assignments = await sql`
      SELECT ds.shift_date, sa.pilot_id, sa.assignment_order
      FROM daily_shifts ds
      JOIN shift_assignments sa ON ds.id = sa.daily_shift_id
      WHERE ds.schedule_id = 5
      LIMIT 10
    `

    // Get assignments for this user if userId is provided
    const userAssignments = userId
      ? await sql`
      SELECT ds.shift_date, sa.pilot_id, sa.assignment_order, sd.shift_letter
      FROM daily_shifts ds
      JOIN shift_assignments sa ON ds.id = sa.daily_shift_id
      JOIN shift_definitions sd ON ds.shift_definition_id = sd.id
      WHERE sa.pilot_id = ${userId}
      ORDER BY ds.shift_date
      LIMIT 10
    `
      : []

    return NextResponse.json({
      success: true,
      debug: {
        userInfo,
        schedules: schedules.length,
        sampleSchedule: schedules[0] || null,
        assignments: assignments.length,
        sampleAssignment: assignments[0] || null,
        userAssignments: userAssignments.length,
        sampleUserAssignment: userAssignments[0] || null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
