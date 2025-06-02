import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get("x-user-id")

  if (!userId) {
    return null
  }

  try {
    const users = await sql`
      SELECT id, first_name, last_name, email, role, is_active
      FROM users
      WHERE id = ${Number.parseInt(userId)} AND is_active = true
    `

    return users[0] || null
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}
