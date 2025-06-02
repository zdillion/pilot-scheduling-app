import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id

    const schedules = await sql`
      SELECT id, month, year, shifts_per_day, is_published, created_by, created_at
      FROM monthly_schedules
      WHERE id = ${scheduleId}
    `

    if (schedules.length === 0) {
      return NextResponse.json({ message: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ schedule: schedules[0] })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const { shifts_per_day } = await request.json()

    const result = await sql`
      UPDATE monthly_schedules
      SET shifts_per_day = ${shifts_per_day}
      WHERE id = ${scheduleId}
      RETURNING id, month, year, shifts_per_day, is_published
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Schedule updated successfully",
      schedule: result[0],
    })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
