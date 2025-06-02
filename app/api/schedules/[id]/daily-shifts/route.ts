import type { NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    // Get all daily shifts with their pilot assignments
    const dailyShifts = await sql`
      WITH shift_pilots AS (
        SELECT 
          sa.daily_shift_id,
          sa.pilot_id,
          sa.assignment_order,
          u.first_name,
          u.last_name
        FROM shift_assignments sa
        JOIN users u ON sa.pilot_id = u.id
      )
      SELECT 
        ds.id,
        ds.shift_definition_id,
        ds.shift_date,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sp.pilot_id,
              'first_name', sp.first_name,
              'last_name', sp.last_name,
              'assignment_order', sp.assignment_order
            )
          ) FILTER (WHERE sp.pilot_id IS NOT NULL),
          '[]'
        ) as pilots
      FROM daily_shifts ds
      LEFT JOIN shift_pilots sp ON ds.id = sp.daily_shift_id
      WHERE ds.schedule_id = ${scheduleId}
      GROUP BY ds.id, ds.shift_definition_id, ds.shift_date
      ORDER BY ds.shift_date, ds.shift_definition_id
    `

    return NextResponse.json({ dailyShifts })
  } catch (error) {
    console.error("Error fetching daily shifts:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
