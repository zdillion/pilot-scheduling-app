import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const pilots = await sql`
      SELECT id, username, first_name, last_name, role, is_active
      FROM users 
      WHERE role IN ('pilot', 'manager') AND is_active = true
      ORDER BY first_name, last_name
    `

    return NextResponse.json({ pilots })
  } catch (error) {
    console.error("Error fetching pilots:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
