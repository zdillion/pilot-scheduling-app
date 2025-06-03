import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pilotId = Number.parseInt(params.id)

    if (isNaN(pilotId)) {
      return NextResponse.json({ error: "Invalid pilot ID" }, { status: 400 })
    }

    const pilot = await sql`
      SELECT id, first_name, last_name, email, is_active
      FROM users
      WHERE id = ${pilotId} AND role = 'pilot'
    `

    if (pilot.length === 0) {
      return NextResponse.json({ error: "Pilot not found" }, { status: 404 })
    }

    return NextResponse.json(pilot[0])
  } catch (error) {
    console.error("Error fetching pilot:", error)
    return NextResponse.json({ error: "Failed to fetch pilot" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pilotId = Number.parseInt(params.id)
    const { first_name, last_name, email, is_active } = await request.json()

    if (isNaN(pilotId)) {
      return NextResponse.json({ error: "Invalid pilot ID" }, { status: 400 })
    }

    const updatedPilot = await sql`
      UPDATE users
      SET first_name = ${first_name}, last_name = ${last_name}, email = ${email}, is_active = ${is_active}
      WHERE id = ${pilotId} AND role = 'pilot'
      RETURNING id, first_name, last_name, email, is_active
    `

    if (updatedPilot.length === 0) {
      return NextResponse.json({ error: "Pilot not found" }, { status: 404 })
    }

    return NextResponse.json(updatedPilot[0])
  } catch (error) {
    console.error("Error updating pilot:", error)
    return NextResponse.json({ error: "Failed to update pilot" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pilotId = Number.parseInt(params.id)

    if (isNaN(pilotId)) {
      return NextResponse.json({ error: "Invalid pilot ID" }, { status: 400 })
    }

    // Delete the pilot
    const deletedPilot = await sql`
      DELETE FROM users
      WHERE id = ${pilotId}
      RETURNING id, first_name, last_name
    `

    if (deletedPilot.length === 0) {
      return NextResponse.json({ error: "Pilot not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Pilot deleted successfully",
      deletedPilot: deletedPilot[0],
    })
  } catch (error) {
    console.error("Error deleting pilot:", error)
    return NextResponse.json({ error: "Failed to delete pilot" }, { status: 500 })
  }
}
