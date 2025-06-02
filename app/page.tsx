"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      // Redirect based on role
      if (user.role === "manager") {
        router.push("/manager")
      } else {
        router.push("/dashboard")
      }
    } else {
      // Not logged in, go to login
      router.push("/login")
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-lg">Loading...</div>
    </div>
  )
}
