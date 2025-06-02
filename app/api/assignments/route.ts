import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get("scheduleId") || "5"

    console.log("Fetching assignments for schedule ID:", scheduleId)

    // Let's first check what tables exist in the database
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    console.log(
      "Available tables:",
      tables.map((t: any) => t.table_name),
    )

    // For now, let's just return the assignments without filtering
    const assignments = await sql`
      SELECT 
        ds.shift_date,
        ds.shift_definition_id,
        sa.assignment_order,
        sa.pilot_id,
        CASE 
          WHEN sa.pilot_id = 0 THEN 
            CASE 
              WHEN sa.assignment_order = 0 THEN 'No'
              ELSE 'No'
            END
          ELSE u.first_name
        END as first_name,
        CASE 
          WHEN sa.pilot_id = 0 THEN 
            CASE 
              WHEN sa.assignment_order = 0 THEN 'PIC'
              ELSE 'SIC'
            END
          ELSE u.last_name
        END as last_name
      FROM daily_shifts ds
      JOIN shift_assignments sa ON ds.id = sa.daily_shift_id
      LEFT JOIN users u ON sa.pilot_id = u.id AND sa.pilot_id != 0
      WHERE ds.schedule_id = ${scheduleId}
      ORDER BY ds.shift_date, ds.shift_definition_id, sa.assignment_order
    `

    console.log("Found assignments:", assignments.length)
    return Response.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return Response.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { scheduleId = "5", shiftDate, shiftDefinitionId, assignmentOrder, pilotId } = await request.json()

    console.log("Creating assignment:", { scheduleId, shiftDate, shiftDefinitionId, assignmentOrder, pilotId })

    // Find the daily_shift_id
    const dailyShifts = await sql`
      SELECT id FROM daily_shifts 
      WHERE schedule_id = ${scheduleId} 
      AND shift_date = ${shiftDate} 
      AND shift_definition_id = ${shiftDefinitionId}
    `

    if (dailyShifts.length === 0) {
      return Response.json({ error: "Daily shift not found" }, { status: 404 })
    }

    const dailyShiftId = dailyShifts[0].id

    // Delete existing assignment if it exists
    await sql`
      DELETE FROM shift_assignments 
      WHERE daily_shift_id = ${dailyShiftId} 
      AND assignment_order = ${assignmentOrder}
    `

    // Insert new assignment if pilotId is not 0 (0 means clear/unassign)
    if (pilotId !== 0) {
      await sql`
        INSERT INTO shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at)
        VALUES (${dailyShiftId}, ${pilotId}, ${assignmentOrder}, 1, NOW())
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return Response.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
