import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Fetch ALL users, not just pilots
    const users = await sql`
      SELECT id, username, first_name, last_name, email, role, is_active
      FROM users
      ORDER BY last_name, first_name
    `

    return NextResponse.json({ pilots: users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { username, password, first_name, last_name, role } = await request.json()

    if (!username || !password || !first_name || !last_name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User with this username already exists" }, { status: 400 })
    }

    // Insert new user
    const newUser = await sql`
      INSERT INTO users (username, first_name, last_name, role, password_hash, is_active, created_at)
      VALUES (${username}, ${first_name}, ${last_name}, ${role}, ${password}, true, NOW())
      RETURNING id, username, first_name, last_name, role, is_active, created_at
    `

    return NextResponse.json(newUser[0], { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
