import { sql } from "@neondatabase/serverless"
import { NextResponse, type NextRequest } from "next/server"

export async function DELETE(request: NextRequest, { params }: { params: { id: string; trainingId: string } }) {
  try {
    const scheduleId = params.id
    const trainingId = params.trainingId

    // Delete the training day
    const result = await sql`
      DELETE FROM training_days 
      WHERE id = ${trainingId} AND schedule_id = ${scheduleId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Training day not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Training day deleted successfully" })
  } catch (error) {
    console.error("Error deleting training day:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
