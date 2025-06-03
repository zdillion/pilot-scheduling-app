"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogOut, Settings, Home, CalendarDays, Cog, ArrowLeftRight, Plane, Menu } from "lucide-react"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
}

interface ShiftAssignment {
  date: string
  shiftLetter: string
  shiftDate: Date
  startTime?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftAssignment[]>([])
  const [upcomingTraining, setUpcomingTraining] = useState<Array<{ date: string; trainingDate: Date }>>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // First useEffect - just handle user authentication
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")

      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        router.push("/login")
      }
    } catch (error) {
      const errorMsg = `Auth error: ${error}`
      setError(errorMsg)
    }
  }, [router])

  // Second useEffect - handle fetching assignments when user is available
  useEffect(() => {
    if (user) {
      // Fetch assignments for all users (pilots, managers, viewers)
      fetchPilotAssignments()
    }
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const fetchPilotAssignments = async () => {
    setIsLoadingAssignments(true)
    let schedulesData: any = null

    try {
      // First, let's see what schedules exist
      const schedulesResponse = await fetch(`/api/schedules?userRole=pilot`)

      if (schedulesResponse.ok) {
        schedulesData = await schedulesResponse.json()

        if (schedulesData.schedules?.length > 0) {
          // Find the current month's schedule first, then fall back to the first one
          const currentDate = new Date()
          const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-based
          const currentYear = currentDate.getFullYear()

          let selectedSchedule = schedulesData.schedules.find(
            (schedule: any) => schedule.month === currentMonth && schedule.year === currentYear,
          )

          // If no current month schedule, use the first available
          if (!selectedSchedule) {
            selectedSchedule = schedulesData.schedules[0]
          }

          const scheduleId = selectedSchedule.id

          // Fetch shift definitions for this schedule
          const shiftDefsResponse = await fetch(`/api/schedules/${scheduleId}/shifts`)

          let shiftDefinitions: any[] = []

          if (shiftDefsResponse.ok) {
            const shiftDefsData = await shiftDefsResponse.json()
            shiftDefinitions = shiftDefsData.shiftDefinitions || []
          }

          // Fetch assignments using the PUBLISHED assignments endpoint
          const assignmentsResponse = await fetch(`/api/assignments/published?scheduleId=${scheduleId}`)

          if (assignmentsResponse.ok) {
            const assignments = await assignmentsResponse.json()

            // Check if any assignments match our user
            const userAssignments = assignments.filter((a: any) => {
              const matches = Number(a.pilot_id) === Number(user?.id)
              return matches
            })

            if (userAssignments.length > 0) {
              // Map assignments to shifts with proper shift information
              const mappedShifts: ShiftAssignment[] = userAssignments.map((assignment: any) => {
                // Find the matching shift definition
                const shiftDef = shiftDefinitions.find((def) => def.id === assignment.shift_definition_id)

                return {
                  date: assignment.shift_date,
                  shiftLetter: shiftDef?.shift_letter || "?",
                  startTime: shiftDef?.start_time || "Unknown",
                  shiftDate: new Date(assignment.shift_date),
                }
              })

              // Filter for future dates and sort
              const today = new Date()
              today.setHours(0, 0, 0, 0)

              const futureShifts = mappedShifts
                .filter((shift) => shift.shiftDate >= today)
                .sort((a, b) => a.shiftDate.getTime() - b.shiftDate.getTime())
                .slice(0, 5)

              setUpcomingShifts(futureShifts)
            } else {
              setUpcomingShifts([])
            }
          }
        }
      }
    } catch (error) {
      const errorMsg = `Error in fetchPilotAssignments: ${error}`
      setError(errorMsg)
    }

    // After the shift assignments section, fetch training assignments from ALL schedules
    try {
      const allUserTrainingAssignments = []

      // Check training assignments in all available schedules
      for (const schedule of schedulesData?.schedules || []) {
        const trainingResponse = await fetch(`/api/schedules/${schedule.id}/training`)

        if (trainingResponse.ok) {
          const trainingData = await trainingResponse.json()

          // Handle the specific structure: { trainingDays: [...] }
          if (trainingData.trainingDays && Array.isArray(trainingData.trainingDays)) {
            // Look through each training day to find ones where the user is assigned
            trainingData.trainingDays.forEach((trainingDay: any) => {
              if (trainingDay.pilots && Array.isArray(trainingDay.pilots)) {
                // Check if the current user is in the pilots array for this training day
                const userIsAssigned = trainingDay.pilots.some((pilot: any) => Number(pilot.id) === Number(user?.id))

                if (userIsAssigned) {
                  allUserTrainingAssignments.push({
                    training_date: trainingDay.training_date,
                    training_name: trainingDay.training_name || "Training",
                    schedule_month: schedule.month,
                    schedule_year: schedule.year,
                  })
                }
              }
            })
          }
        }
      }

      if (allUserTrainingAssignments.length > 0) {
        // Map training assignments
        const mappedTraining = allUserTrainingAssignments.map((training: any) => ({
          date: training.training_date,
          trainingDate: new Date(training.training_date),
          scheduleInfo: `${training.schedule_month}/${training.schedule_year}`,
        }))

        // Filter for future dates and sort
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const futureTraining = mappedTraining
          .filter((training) => training.trainingDate >= today)
          .sort((a, b) => a.trainingDate.getTime() - b.trainingDate.getTime())

        setUpcomingTraining(futureTraining)
      } else {
        setUpcomingTraining([])
      }
    } catch (error) {
      setUpcomingTraining([])
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString || timeString === "Unknown") return "Unknown"
    try {
      // Handle both HH:MM and HHMM formats
      let formattedTime = timeString
      if (timeString.length === 4 && !timeString.includes(":")) {
        formattedTime = `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`
      }
      return new Date(`2000-01-01T${formattedTime}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return timeString
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1>Loading user data...</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-black shadow-sm border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-semibold text-white">Pilot Dashboard</h1>
            <div className="flex-1 flex justify-center">
              <span className="text-sm text-gray-300">Welcome, {user.first_name}</span>
            </div>
            <div className="flex items-center space-x-4">
              {user.role === "manager" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/manager")}
                  className="bg-black border-white text-white hover:bg-white hover:text-black"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manager
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-black border-white text-white hover:bg-white hover:text-black"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Toggle */}
      <div className="md:hidden bg-black border-b border-white p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-full bg-black border-white text-white hover:bg-white hover:text-black"
        >
          <Menu className="w-4 h-4 mr-2" />
          {mobileMenuOpen ? "Hide Menu" : "Show Menu"}
        </Button>
      </div>

      {/* Navigation Links - Desktop (always visible) and Mobile (toggleable) */}
      <nav className={`bg-black border-b border-white ${mobileMenuOpen ? "block" : "hidden"} md:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:space-x-8">
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800 justify-start"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              onClick={() => router.push("/schedule/view")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              onClick={() => router.push("/options")}
            >
              <Cog className="w-4 h-4 mr-2" />
              Options
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              disabled
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Trades
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              disabled
            >
              <Plane className="w-4 h-4 mr-2" />
              Time Off
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 text-white rounded-md">
            <h3 className="font-semibold">Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Quick Stats Section - Available to all users */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-black border-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {isLoadingAssignments ? "..." : upcomingShifts.length}
                  </div>
                  <div className="text-sm text-gray-300 mb-3">Upcoming Shifts</div>
                  {upcomingShifts.length > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      {upcomingShifts.map((shift, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>
                            {new Date(shift.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span>
                            {shift.shiftLetter} Shift ({formatTime(shift.startTime || "")})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black border-white">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {isLoadingAssignments ? "..." : upcomingTraining.length}
                  </div>
                  <div className="text-sm text-gray-300 mb-3">Training Days</div>
                  {upcomingTraining.length > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      {upcomingTraining.map((training, index) => (
                        <div key={index}>
                          {new Date(training.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -
                          Training
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
