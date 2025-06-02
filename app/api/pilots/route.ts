import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const pilots = await sql`
      SELECT id, first_name, last_name, email, is_active
      FROM users
      WHERE role = 'pilot' AND is_active = true
      ORDER BY last_name, first_name
    `

    return NextResponse.json(pilots)
  } catch (error) {
    console.error("Error fetching pilots:", error)
    return NextResponse.json({ error: "Failed to fetch pilots" }, { status: 500 })
  }
}
