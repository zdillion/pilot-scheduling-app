"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarDays, ArrowLeft } from "lucide-react"

export default function CreateSchedulePage() {
  const [user, setUser] = useState<any | null>(null)
  const [month, setMonth] = useState("")
  const [year, setYear] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      if (parsedUser.role !== "manager") {
        router.push("/dashboard")
      }
    } else {
      router.push("/login")
    }

    // Set default to current month/year
    const now = new Date()
    setMonth((now.getMonth() + 1).toString())
    setYear(now.getFullYear().toString())
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({
          month: Number.parseInt(month),
          year: Number.parseInt(year),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Schedule created successfully!")
        setTimeout(() => {
          router.push(`/schedule/edit/${data.id}`)
        }, 1500)
      } else {
        setError(data.error || "Failed to create schedule")
      }
    } catch (error) {
      setError("An error occurred while creating the schedule")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-black shadow-sm border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.push("/manager")}
              className="text-white hover:bg-gray-800 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Manager
            </Button>
            <h1 className="text-xl font-semibold text-white">Create New Schedule</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="bg-black border-white">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CalendarDays className="w-5 h-5 mr-2" />
              New Monthly Schedule
            </CardTitle>
            <CardDescription className="text-gray-300">
              Create a new schedule for pilots and training assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="bg-red-900 border-red-600 text-red-100">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-900 border-green-600 text-green-100">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month" className="text-white">
                    Month
                  </Label>
                  <select
                    id="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-black border border-white text-white rounded-md focus:border-blue-400 focus:ring-blue-400"
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year" className="text-white">
                    Year
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="2024"
                    max="2030"
                    required
                    className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/manager")}
                  className="bg-black border-white text-white hover:bg-white hover:text-black"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-white text-black hover:bg-gray-200" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Schedule"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
