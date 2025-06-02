import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    console.log(`Fetching training days for schedule ID: ${scheduleId}`)

    // First, let's see what tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    console.log(
      "Available tables:",
      tables.map((t) => t.table_name),
    )

    // For now, skip the publish check until we know the correct table name
    // Fetch training days with their assigned pilots
    const trainingDays = await sql`
      WITH training_pilots AS (
        SELECT 
          ta.training_day_id,
          ta.pilot_id,
          u.first_name,
          u.last_name
        FROM training_assignments ta
        JOIN users u ON ta.pilot_id = u.id
        WHERE ta.pilot_id > 0
      )
      SELECT 
        td.id,
        td.training_date,
        'Training' as training_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tp.pilot_id,
              'first_name', tp.first_name,
              'last_name', tp.last_name
            )
          ) FILTER (WHERE tp.pilot_id IS NOT NULL),
          '[]'
        ) as pilots
      FROM training_days td
      LEFT JOIN training_pilots tp ON td.id = tp.training_day_id
      WHERE td.schedule_id = ${scheduleId}
      GROUP BY td.id, td.training_date
      ORDER BY td.training_date
    `

    console.log(`Found ${trainingDays.length} training days`)
    return NextResponse.json({ trainingDays })
  } catch (error) {
    console.error("Error fetching training days:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { training_date } = await request.json()

    if (!training_date) {
      return NextResponse.json({ message: "Training date is required" }, { status: 400 })
    }

    // Create the training day
    const result = await sql`
      INSERT INTO training_days (schedule_id, training_date)
      VALUES (${scheduleId}, ${training_date})
      RETURNING id, training_date
    `

    const trainingDay = result[0]

    return NextResponse.json({
      message: "Training day created successfully",
      trainingDay,
    })
  } catch (error) {
    console.error("Error creating training day:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
