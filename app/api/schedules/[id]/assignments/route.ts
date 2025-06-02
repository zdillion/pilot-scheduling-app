import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    console.log(`=== API: Fetching assignments for schedule ID: ${scheduleId} ===`)

    // STEP 1: Check if draft tables have any data for this schedule
    const draftShiftCount = await sql`
      SELECT COUNT(*) as count
      FROM draft_shift_assignments dsa
      JOIN daily_shifts ds ON dsa.daily_shift_id = ds.id
      WHERE ds.schedule_id = ${scheduleId}
    `

    const draftTrainingCount = await sql`
      SELECT COUNT(*) as count  
      FROM draft_training_assignments dta
      JOIN training_days td ON dta.training_day_id = td.id
      WHERE td.schedule_id = ${scheduleId}
    `

    const hasDraftData = draftShiftCount[0].count > 0 || draftTrainingCount[0].count > 0

    console.log(
      `Draft data exists: ${hasDraftData} (${draftShiftCount[0].count} shifts, ${draftTrainingCount[0].count} training)`,
    )

    // STEP 2: If no draft data exists, copy published → draft for editing
    if (!hasDraftData) {
      console.log("No draft data found, copying published assignments to draft tables...")

      // Copy published shift assignments to draft
      await sql`
        INSERT INTO draft_shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at)
        SELECT sa.daily_shift_id, sa.pilot_id, sa.assignment_order, sa.assigned_by, sa.assigned_at
        FROM shift_assignments sa
        JOIN daily_shifts ds ON sa.daily_shift_id = ds.id
        WHERE ds.schedule_id = ${scheduleId}
      `

      // Copy published training assignments to draft
      await sql`
        INSERT INTO draft_training_assignments (training_day_id, pilot_id, assignment_order, assigned_by, assigned_at)
        SELECT ta.training_day_id, ta.pilot_id, ta.assignment_order, ta.assigned_by, ta.assigned_at
        FROM training_assignments ta
        JOIN training_days td ON ta.training_day_id = td.id
        WHERE td.schedule_id = ${scheduleId}
      `

      console.log("Published assignments copied to draft tables")
    }

    // STEP 3: Always return DRAFT data for manager editing
    const draftShiftAssignments = await sql`
      SELECT 
        ds.shift_date,
        ds.shift_definition_id,
        dsa.assignment_order,
        dsa.pilot_id,
        u.first_name,
        u.last_name
      FROM daily_shifts ds
      JOIN draft_shift_assignments dsa ON ds.id = dsa.daily_shift_id
      JOIN users u ON dsa.pilot_id = u.id
      WHERE ds.schedule_id = ${scheduleId}
      ORDER BY ds.shift_date, ds.shift_definition_id, dsa.assignment_order
    `

    const draftTrainingAssignments = await sql`
      SELECT 
        td.training_date,
        dta.training_day_id,
        dta.assignment_order,
        dta.pilot_id,
        u.first_name,
        u.last_name
      FROM draft_training_assignments dta
      JOIN training_days td ON dta.training_day_id = td.id
      JOIN users u ON dta.pilot_id = u.id
      WHERE td.schedule_id = ${scheduleId}
      ORDER BY td.training_date, dta.assignment_order
    `

    const data = {
      shiftAssignments: draftShiftAssignments,
      trainingAssignments: draftTrainingAssignments,
    }

    console.log("=== API: Returning DRAFT data for editing ===", {
      shiftAssignments: data.shiftAssignments.length,
      trainingAssignments: data.trainingAssignments.length,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { type, date, shiftId, trainingId, slotIndex, pilotId, assignedBy } = await request.json()

    console.log("Assignment request received:", {
      type,
      date,
      shiftId,
      trainingId,
      slotIndex,
      pilotId,
      assignedBy,
    })

    if (type === "shift") {
      // Handle shift assignment - save to DRAFT table
      if (!shiftId || !date || slotIndex === undefined || pilotId === undefined) {
        return NextResponse.json({ message: "Missing required fields for shift assignment" }, { status: 400 })
      }

      // First, ensure the daily_shift exists
      const dailyShift = await sql`
        SELECT id FROM daily_shifts 
        WHERE schedule_id = ${scheduleId} AND shift_definition_id = ${shiftId} AND shift_date = ${date}
      `

      let dailyShiftId
      if (dailyShift.length === 0) {
        // Create the daily shift
        const newDailyShift = await sql`
          INSERT INTO daily_shifts (schedule_id, shift_definition_id, shift_date)
          VALUES (${scheduleId}, ${shiftId}, ${date})
          RETURNING id
        `
        dailyShiftId = newDailyShift[0].id
      } else {
        dailyShiftId = dailyShift[0].id
      }

      // Check if assignment already exists for this slot in DRAFT table
      const existingAssignment = await sql`
        SELECT id FROM draft_shift_assignments 
        WHERE daily_shift_id = ${dailyShiftId} AND assignment_order = ${slotIndex}
      `

      if (existingAssignment.length > 0) {
        // Update existing assignment
        await sql`
          UPDATE draft_shift_assignments 
          SET pilot_id = ${pilotId}, assigned_by = ${assignedBy}, assigned_at = NOW()
          WHERE daily_shift_id = ${dailyShiftId} AND assignment_order = ${slotIndex}
        `
      } else {
        // Create new assignment
        await sql`
          INSERT INTO draft_shift_assignments (daily_shift_id, pilot_id, assignment_order, assigned_by, assigned_at)
          VALUES (${dailyShiftId}, ${pilotId}, ${slotIndex}, ${assignedBy}, NOW())
        `
      }
    } else if (type === "training") {
      // Handle training assignment - save to DRAFT table
      if (!trainingId || slotIndex === undefined || pilotId === undefined) {
        return NextResponse.json({ message: "Missing required fields for training assignment" }, { status: 400 })
      }

      // Check if assignment already exists for this slot in DRAFT table
      const existingAssignment = await sql`
        SELECT id FROM draft_training_assignments 
        WHERE training_day_id = ${trainingId} AND assignment_order = ${slotIndex}
      `

      if (existingAssignment.length > 0) {
        // Update existing assignment
        await sql`
          UPDATE draft_training_assignments 
          SET pilot_id = ${pilotId}, assigned_by = ${assignedBy}, assigned_at = NOW()
          WHERE training_day_id = ${trainingId} AND assignment_order = ${slotIndex}
        `
      } else {
        // Create new assignment
        await sql`
          INSERT INTO draft_training_assignments (training_day_id, pilot_id, assignment_order, assigned_by, assigned_at)
          VALUES (${trainingId}, ${pilotId}, ${slotIndex}, ${assignedBy}, NOW())
        `
      }
    }

    return NextResponse.json({ message: "Draft assignment saved successfully" })
  } catch (error) {
    console.error("Error saving assignment:", error)
    return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 })
  }
}
