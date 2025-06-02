import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    console.log(`=== Checking assignments for user ID: ${userId} ===`)

    // Get all schedules
    const schedules = await sql`
      SELECT id, month, year, is_published
      FROM monthly_schedules
      ORDER BY year DESC, month DESC
    `
    console.log(`Found ${schedules.length} total schedules:`, schedules)

    // Check shift assignments across all schedules
    const shiftAssignments = await sql`
      SELECT 
        ms.id as schedule_id,
        ms.month,
        ms.year,
        ms.is_published,
        ds.shift_date,
        ds.shift_definition_id,
        sa.assignment_order,
        sa.pilot_id,
        u.first_name,
        u.last_name,
        sd.shift_letter
      FROM monthly_schedules ms
      JOIN daily_shifts ds ON ms.id = ds.schedule_id
      JOIN shift_assignments sa ON ds.id = sa.daily_shift_id
      JOIN users u ON sa.pilot_id = u.id
      LEFT JOIN shift_definitions sd ON ds.shift_definition_id = sd.id
      WHERE sa.pilot_id = ${userId}
      ORDER BY ms.year DESC, ms.month DESC, ds.shift_date
    `
    console.log(`Found ${shiftAssignments.length} shift assignments for user ${userId}:`, shiftAssignments)

    // Check training assignments across all schedules
    const trainingAssignments = await sql`
      SELECT 
        ms.id as schedule_id,
        ms.month,
        ms.year,
        ms.is_published,
        td.training_date,
        ta.assignment_order,
        ta.pilot_id,
        u.first_name,
        u.last_name
      FROM monthly_schedules ms
      JOIN training_days td ON ms.id = td.schedule_id
      JOIN training_assignments ta ON td.id = ta.training_day_id
      JOIN users u ON ta.pilot_id = u.id
      WHERE ta.pilot_id = ${userId}
      ORDER BY ms.year DESC, ms.month DESC, td.training_date
    `
    console.log(`Found ${trainingAssignments.length} training assignments for user ${userId}:`, trainingAssignments)

    // Also check what user record exists
    const userRecord = await sql`
      SELECT id, username, first_name, last_name, role
      FROM users
      WHERE id = ${userId}
    `
    console.log(`User record:`, userRecord)

    return NextResponse.json({
      userId,
      userRecord: userRecord[0] || null,
      schedules,
      shiftAssignments,
      trainingAssignments,
      summary: {
        totalSchedules: schedules.length,
        publishedSchedules: schedules.filter((s) => s.is_published).length,
        totalShiftAssignments: shiftAssignments.length,
        totalTrainingAssignments: trainingAssignments.length,
      },
    })
  } catch (error) {
    console.error("Error checking user assignments:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
