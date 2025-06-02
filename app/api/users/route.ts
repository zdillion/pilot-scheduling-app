import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const users = await sql`
      SELECT id, first_name, last_name, email, role, is_active, created_at
      FROM users
      ORDER BY last_name, first_name
    `

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { first_name, last_name, email, role, password } = await request.json()

    if (!first_name || !last_name || !email || !role || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Insert new user
    const newUser = await sql`
      INSERT INTO users (first_name, last_name, email, role, password_hash, is_active, created_at)
      VALUES (${first_name}, ${last_name}, ${email}, ${role}, ${password}, true, NOW())
      RETURNING id, first_name, last_name, email, role, is_active, created_at
    `

    return NextResponse.json(newUser[0], { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
