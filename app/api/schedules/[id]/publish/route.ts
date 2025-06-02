import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    // Get current schedule to check if it's already published
    const currentSchedule = await sql`
      SELECT id, is_published, version
      FROM monthly_schedules
      WHERE id = ${scheduleId}
    `

    if (currentSchedule.length === 0) {
      return NextResponse.json({ message: "Schedule not found" }, { status: 404 })
    }

    const schedule = currentSchedule[0]

    // Determine the new version number
    let newVersion = schedule.version
    if (!schedule.is_published) {
      // First publish: set version to 1
      newVersion = 1
    } else {
      // Already published: increment version
      newVersion = schedule.version + 1
    }

    // Start transaction to copy draft data to published tables
    await sql`BEGIN`

    try {
      // Clear existing published assignments for this schedule
      await sql`
        DELETE FROM shift_assignments 
        WHERE daily_shift_id IN (
          SELECT id FROM daily_shifts WHERE schedule_id = ${scheduleId}
        )
      `

      await sql`
        DELETE FROM training_assignments 
        WHERE training_day_id IN (
          SELECT id FROM training_days WHERE schedule_id = ${scheduleId}
        )
      `

      // Copy draft shift assignments to published table
      await sql`
        INSERT INTO shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at)
        SELECT daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at
        FROM draft_shift_assignments dsa
        JOIN daily_shifts ds ON dsa.daily_shift_id = ds.id
        WHERE ds.schedule_id = ${scheduleId}
      `

      // Copy draft training assignments to published table
      await sql`
        INSERT INTO training_assignments (training_day_id, pilot_id, assignment_order, assigned_by, assigned_at)
        SELECT training_day_id, pilot_id, assignment_order, assigned_by, assigned_at
        FROM draft_training_assignments dta
        JOIN training_days td ON dta.training_day_id = td.id
        WHERE td.schedule_id = ${scheduleId}
      `

      // Update schedule status
      const result = await sql`
        UPDATE monthly_schedules
        SET is_published = true, version = ${newVersion}
        WHERE id = ${scheduleId}
        RETURNING id, month, year, shifts_per_day, is_published, version
      `

      await sql`COMMIT`

      return NextResponse.json({
        message: `Schedule published successfully as version ${newVersion}. Draft assignments copied to published tables.`,
        schedule: result[0],
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error publishing schedule:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
