"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, Home, CalendarDays, Cog, ArrowLeftRight, Plane, Menu } from "lucide-react"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
}

interface ShiftDefinition {
  id: number
  shift_letter: string
  start_time: string
  end_time: string
  color: string
}

interface TrainingDay {
  id: number
  training_date: string
  training_name: string
  pilots: Array<{ id: number; first_name: string; last_name: string }>
}

interface Schedule {
  id: number
  month: number
  year: number
  name: string
}

export default function ScheduleViewPage() {
  const [user, setUser] = useState<User | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>([])
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [pilots, setPilots] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [calendarDays, setCalendarDays] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // First useEffect - handle user authentication
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
      setError(`Auth error: ${error}`)
    }
  }, [router])

  // Second useEffect - fetch schedules when user is available
  useEffect(() => {
    if (user) {
      fetchSchedules()
    }
  }, [user])

  // Third useEffect - fetch schedule data when a schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      fetchScheduleData(selectedSchedule.id)
    }
  }, [selectedSchedule])

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/schedules?userRole=${user?.role}`)

      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])

        // Find the current month's schedule first, then fall back to the first one
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-based
        const currentYear = currentDate.getFullYear()

        let currentSchedule = data.schedules.find(
          (schedule: any) => schedule.month === currentMonth && schedule.year === currentYear,
        )

        // If no current month schedule, use the first available
        if (!currentSchedule && data.schedules.length > 0) {
          currentSchedule = data.schedules[0]
        }

        if (currentSchedule) {
          setSelectedSchedule(currentSchedule)
        }
      } else {
        setError("Failed to fetch schedules")
      }
    } catch (error) {
      setError(`Error fetching schedules: ${error}`)
    }
  }

  const fetchScheduleData = async (scheduleId: number) => {
    setLoading(true)
    setError(null)

    try {
      // Fetch shift definitions
      const shiftDefsResponse = await fetch(`/api/schedules/${scheduleId}/shifts`)

      if (shiftDefsResponse.ok) {
        const shiftDefsData = await shiftDefsResponse.json()
        setShiftDefinitions(shiftDefsData.shiftDefinitions || [])
      } else {
        setError("Failed to fetch shift definitions")
      }

      // Fetch training days
      const trainingResponse = await fetch(`/api/schedules/${scheduleId}/training`)

      if (trainingResponse.ok) {
        const trainingData = await trainingResponse.json()
        setTrainingDays(trainingData.trainingDays || [])
      } else {
        setError("Failed to fetch training days")
      }

      // Fetch pilots
      const pilotsResponse = await fetch(`/api/users/pilots`)

      if (pilotsResponse.ok) {
        const pilotsData = await pilotsResponse.json()
        setPilots(pilotsData.pilots || [])
      } else {
        setError("Failed to fetch pilots")
      }

      // Fetch assignments
      const assignmentsResponse = await fetch(`/api/assignments/published?scheduleId=${scheduleId}`)

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        setAssignments(assignmentsData || [])
      } else {
        setError("Failed to fetch assignments")
      }

      // Generate calendar days for the selected month
      if (selectedSchedule) {
        const year = selectedSchedule.year
        const month = selectedSchedule.month - 1 // JavaScript months are 0-based
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const days = []

        for (let day = 1; day <= lastDay.getDate(); day++) {
          days.push(new Date(year, month, day))
        }

        setCalendarDays(days)
      }

      setLoading(false)
    } catch (error) {
      setError(`Error fetching schedule data: ${error}`)
      setLoading(false)
    }
  }

  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scheduleId = Number.parseInt(e.target.value)
    const schedule = schedules.find((s) => s.id === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  // Helper function to get assignments for a specific day
  const getAssignmentsForDay = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return assignments.filter((assignment) => assignment.shift_date === dateString)
  }

  // Helper function to get training for a specific day
  const getTrainingForDay = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return trainingDays.find((training) => training.training_date === dateString)
  }

  // Helper function to get shift letter from shift definition ID
  const getShiftLetter = (shiftDefinitionId: number) => {
    const shiftDef = shiftDefinitions.find((def) => def.id === shiftDefinitionId)
    return shiftDef ? shiftDef.shift_letter : "?"
  }

  // Helper function to get pilot name from pilot ID
  const getPilotName = (pilotId: number) => {
    const pilot = pilots.find((p) => p.id === pilotId)
    return pilot ? `${pilot.first_name} ${pilot.last_name}` : "Unknown"
  }

  // Helper function to check if the current user is assigned to a shift
  const isUserAssigned = (assignments: any[]) => {
    return assignments.some((assignment) => assignment.pilot_id === user?.id)
  }

  // Helper function to check if the current user is assigned to training
  const isUserAssignedToTraining = (training: TrainingDay | undefined) => {
    if (!training || !training.pilots) return false
    return training.pilots.some((pilot) => pilot.id === user?.id)
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
            <h1 className="text-xl font-semibold text-white">Schedule View</h1>
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
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start"
              onClick={() => router.push("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800 justify-start"
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
        {/* Schedule selector */}
        <div className="mb-6">
          <label htmlFor="schedule-select" className="block text-sm font-medium text-gray-300 mb-2">
            Select Schedule:
          </label>
          <select
            id="schedule-select"
            className="bg-black border border-white text-white rounded-md px-3 py-2 w-full md:w-auto"
            value={selectedSchedule?.id || ""}
            onChange={handleScheduleChange}
          >
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.name || `${schedule.month}/${schedule.year}`}
              </option>
            ))}
          </select>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 text-white rounded-md">
            <h3 className="font-semibold">Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-white">Loading schedule data...</p>
          </div>
        )}

        {/* Calendar View */}
        {!loading && selectedSchedule && (
          <div className="calendar-container">
            <div className="calendar-grid grid grid-cols-7 gap-1 bg-gray-900 p-2 rounded-lg">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-semibold text-white p-1">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before the 1st of the month */}
              {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, index) => (
                <div key={`empty-start-${index}`} className="bg-gray-800 min-h-[80px] rounded"></div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayAssignments = getAssignmentsForDay(day)
                const dayTraining = getTrainingForDay(day)
                const isUserDay = isUserAssigned(dayAssignments) || isUserAssignedToTraining(dayTraining)

                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-gray-800 min-h-[80px] rounded p-1 ${isUserDay ? "ring-2 ring-green-500" : ""}`}
                  >
                    <div className="text-right text-xs text-gray-400">{day.getDate()}</div>

                    {/* Shift assignments */}
                    <div className="mt-1 space-y-1">
                      {dayAssignments.map((assignment) => {
                        const shiftLetter = getShiftLetter(assignment.shift_definition_id)
                        const pilotName = getPilotName(assignment.pilot_id)
                        const isCurrentUser = assignment.pilot_id === user?.id

                        return (
                          <div
                            key={`${assignment.id}-${assignment.pilot_id}`}
                            className={`text-[9px] truncate ${
                              isCurrentUser ? "text-green-400 font-bold" : "text-white"
                            }`}
                            title={`${shiftLetter} Shift: ${pilotName}`}
                          >
                            {shiftLetter}: {pilotName}
                          </div>
                        )
                      })}

                      {/* Training */}
                      {dayTraining && (
                        <div className="bg-blue-900 text-[9px] p-0.5 rounded mt-1">
                          <div className="font-semibold truncate">Training</div>
                          <div className="space-y-0.5">
                            {dayTraining.pilots.map((pilot) => (
                              <div
                                key={pilot.id}
                                className={`truncate ${
                                  pilot.id === user?.id ? "text-green-400 font-bold" : "text-white"
                                }`}
                              >
                                {pilot.first_name} {pilot.last_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Empty cells for days after the last day of the month */}
              {Array.from({
                length: 6 - (calendarDays[calendarDays.length - 1]?.getDay() || 0),
              }).map((_, index) => (
                <div key={`empty-end-${index}`} className="bg-gray-800 min-h-[80px] rounded"></div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
