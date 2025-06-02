import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { userId, scheduleId, shiftDefinitionId, shiftDate } = await request.json()

    console.log("Adding assignment:", { userId, scheduleId, shiftDefinitionId, shiftDate })

    // First, find or create the daily shift
    const dailyShifts = await sql`
      SELECT id FROM daily_shifts 
      WHERE schedule_id = ${scheduleId} 
      AND shift_date = ${shiftDate} 
      AND shift_definition_id = ${shiftDefinitionId}
    `

    let dailyShiftId
    if (dailyShifts.length === 0) {
      // Create the daily shift
      const newDailyShift = await sql`
        INSERT INTO daily_shifts (schedule_id, shift_date, shift_definition_id)
        VALUES (${scheduleId}, ${shiftDate}, ${shiftDefinitionId})
        RETURNING id
      `
      dailyShiftId = newDailyShift[0].id
      console.log("Created new daily shift:", dailyShiftId)
    } else {
      dailyShiftId = dailyShifts[0].id
      console.log("Using existing daily shift:", dailyShiftId)
    }

    // Check if assignment already exists
    const existingAssignment = await sql`
      SELECT id FROM shift_assignments 
      WHERE daily_shift_id = ${dailyShiftId} 
      AND pilot_id = ${userId}
    `

    if (existingAssignment.length > 0) {
      return Response.json({ message: "Assignment already exists", assignmentId: existingAssignment[0].id })
    }

    // Create the assignment
    const assignment = await sql`
      INSERT INTO shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at)
      VALUES (${dailyShiftId}, ${userId}, 0, 1, NOW())
      RETURNING id
    `

    console.log("Created assignment:", assignment[0].id)

    return Response.json({
      success: true,
      message: "Assignment created successfully",
      assignmentId: assignment[0].id,
      dailyShiftId: dailyShiftId,
    })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return Response.json({ error: "Failed to create assignment", details: error }, { status: 500 })
  }
}
