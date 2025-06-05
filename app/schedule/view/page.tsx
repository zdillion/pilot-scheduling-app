"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ArrowLeft, Home, CalendarDays, Cog, ArrowLeftRight, Plane, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: number
  user_id: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
}

interface Schedule {
  id: number
  month: number
  year: number
  shifts_per_day: number
  is_published: boolean
  version: number
}

interface ShiftDefinition {
  id: number
  shift_letter: string
  start_time: string
  duration_hours: number
  pilots_required: number
}

interface DailyShift {
  id: number
  shift_definition_id: number
  shift_date: string
  pilots: {
    id: number
    first_name: string
    last_name: string
    assignment_order: number
  }[]
}

interface TrainingDay {
  id: number
  training_date: string
  training_name: string
  pilots: {
    id: number
    first_name: string
    last_name: string
  }[]
}

export default function ScheduleViewPage() {
  const [user, setUser] = useState<User | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>([])
  const [dailyShifts, setDailyShifts] = useState<DailyShift[]>([])
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const scheduleIdFromUrl = searchParams.get("id")

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push("/login")
    }
  }, [router])

  useEffect(() => {
    if (user) {
      fetchSchedules()
    }
  }, [user])

  const fetchSchedules = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // If there's a specific schedule ID in the URL, fetch that schedule directly (for manager preview from edit/manage pages)
      if (scheduleIdFromUrl && user.role === "manager") {
        await fetchSpecificSchedule(Number.parseInt(scheduleIdFromUrl))
      } else {
        // For regular schedule view, ALL users (including managers) only see published schedules
        const response = await fetch(`/api/schedules?userRole=pilot`) // Force pilot view for everyone
        if (response.ok) {
          const data = await response.json()
          setSchedules(data.schedules)

          // If schedules exist, select the current month's schedule by default if available
          if (data.schedules.length > 0) {
            const today = new Date()
            const currentMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
            const currentYear = today.getFullYear()

            // Try to find current month's schedule
            const currentMonthSchedule = data.schedules.find(
              (s: Schedule) => s.month === currentMonth && s.year === currentYear,
            )

            if (currentMonthSchedule) {
              // If current month schedule exists, select it
              setSelectedSchedule(currentMonthSchedule)
              setCurrentDate(new Date(currentMonthSchedule.year, currentMonthSchedule.month - 1, 1))
              fetchScheduleDetails(currentMonthSchedule.id)
            } else {
              // Otherwise, fall back to most recent schedule
              const sortedSchedules = [...data.schedules].sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year
                return a.month - b.month
              })

              const latestSchedule = sortedSchedules[0]
              setSelectedSchedule(latestSchedule)
              setCurrentDate(new Date(latestSchedule.year, latestSchedule.month - 1, 1))
              fetchScheduleDetails(latestSchedule.id)
            }
          } else {
            setIsLoading(false)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching schedules:", error)
      setIsLoading(false)
    }
  }

  const fetchSpecificSchedule = async (scheduleId: number) => {
    try {
      // Fetch the specific schedule (managers can view any schedule)
      const response = await fetch(`/api/schedules/${scheduleId}`)
      if (response.ok) {
        const data = await response.json()
        const schedule = data.schedule

        setSelectedSchedule(schedule)
        setSchedules([schedule]) // Set as the only available schedule
        setCurrentDate(new Date(schedule.year, schedule.month - 1, 1))
        fetchScheduleDetails(schedule.id)
      } else {
        setIsLoading(false)
        // If can't fetch specific schedule, fall back to normal behavior
        const schedulesResponse = await fetch(`/api/schedules?userRole=${user?.role}`)
        if (schedulesResponse.ok) {
          const schedulesData = await schedulesResponse.json()
          setSchedules(schedulesData.schedules)
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error("Error fetching specific schedule:", error)
      setIsLoading(false)
    }
  }

  const fetchScheduleDetails = async (scheduleId: number) => {
    try {
      setIsLoading(true)
      console.log("Fetching schedule details for ID:", scheduleId)

      // Fetch shift definitions
      const shiftDefsResponse = await fetch(`/api/schedules/${scheduleId}/shifts`)
      if (shiftDefsResponse.ok) {
        const shiftData = await shiftDefsResponse.json()
        setShiftDefinitions(shiftData.shiftDefinitions)
        console.log("Shift definitions:", shiftData.shiftDefinitions)
      }

      // Fetch assignments (both shifts and training) - use the actual schedule ID
      const assignmentsResponse = await fetch(`/api/schedules/${scheduleId}/assignments`)
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        console.log("Assignments data:", assignmentsData)

        // Convert shift assignments to daily shifts format
        const processedDailyShifts: DailyShift[] = []

        if (assignmentsData.shiftAssignments) {
          // Group assignments by date and shift
          const groupedAssignments = assignmentsData.shiftAssignments.reduce((acc: any, assignment: any) => {
            const dateKey = assignment.shift_date.split("T")[0] // Remove time part
            const shiftKey = assignment.shift_definition_id

            if (!acc[dateKey]) acc[dateKey] = {}
            if (!acc[dateKey][shiftKey]) acc[dateKey][shiftKey] = []

            acc[dateKey][shiftKey].push({
              id: assignment.pilot_id,
              first_name: assignment.first_name,
              last_name: assignment.last_name,
              assignment_order: assignment.assignment_order,
            })

            return acc
          }, {})

          // Convert to DailyShift format
          Object.entries(groupedAssignments).forEach(([date, shifts]: [string, any]) => {
            Object.entries(shifts).forEach(([shiftId, pilots]: [string, any]) => {
              processedDailyShifts.push({
                id: Number.parseInt(shiftId),
                shift_definition_id: Number.parseInt(shiftId),
                shift_date: date,
                pilots: pilots,
              })
            })
          })
        }

        setDailyShifts(processedDailyShifts)
        console.log("Processed daily shifts:", processedDailyShifts)

        // Process training assignments
        if (assignmentsData.trainingAssignments) {
          const processedTrainingDays: TrainingDay[] = []

          // Group training assignments by date and training day
          const groupedTraining = assignmentsData.trainingAssignments.reduce((acc: any, assignment: any) => {
            const dateKey = assignment.training_date.split("T")[0] // Remove time part
            const trainingId = assignment.training_day_id

            if (!acc[dateKey]) acc[dateKey] = {}
            if (!acc[dateKey][trainingId]) {
              acc[dateKey][trainingId] = {
                id: trainingId,
                training_date: dateKey,
                training_name: "Training",
                pilots: [],
              }
            }

            // Only add pilots with valid IDs (not 0)
            if (assignment.pilot_id > 0) {
              acc[dateKey][trainingId].pilots.push({
                id: assignment.pilot_id,
                first_name: assignment.first_name,
                last_name: assignment.last_name,
              })
            }

            return acc
          }, {})

          // Convert to TrainingDay format
          Object.values(groupedTraining).forEach((dateGroup: any) => {
            Object.values(dateGroup).forEach((training: any) => {
              processedTrainingDays.push(training)
            })
          })

          setTrainingDays(processedTrainingDays)
          console.log("Processed training days:", processedTrainingDays)
        }
      } else {
        console.error("Failed to fetch assignments")
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching schedule details:", error)
      setIsLoading(false)
    }
  }

  const handleScheduleChange = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id.toString() === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
      setCurrentDate(new Date(schedule.year, schedule.month - 1, 1))
      fetchScheduleDetails(schedule.id)
    }
  }

  const getDailyShiftsForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd")
    return dailyShifts.filter((shift) => shift.shift_date === dateString)
  }

  const getTrainingForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd")
    console.log("Looking for training on:", dateString)
    console.log(
      "Available training days:",
      trainingDays.map((t) => ({ id: t.id, date: t.training_date })),
    )

    const matchingTraining = trainingDays.filter((training) => {
      // Handle both ISO string and date-only string formats
      const trainingDate = training.training_date.includes("T")
        ? training.training_date.split("T")[0]
        : training.training_date

      return trainingDate === dateString
    })

    console.log("Matching training for date:", matchingTraining)
    return matchingTraining
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getBackButtonDestination = () => {
    if (scheduleIdFromUrl && user?.role === "manager") {
      // If viewing a specific schedule as manager (preview mode), go back to schedule management
      return "/schedule/manage"
    }
    // Otherwise, always go to pilot dashboard (same for all users)
    return "/dashboard"
  }

  const getBackButtonText = () => {
    if (scheduleIdFromUrl && user?.role === "manager") {
      return "Back to Schedule Management"
    }
    return "Pilot Dashboard"
  }

  if (!user) {
    return <div>Loading...</div>
  }

  // Don't show pilot navigation if this is a manager preview
  const showPilotNavigation = !(scheduleIdFromUrl && user.role === "manager")

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-black shadow-sm border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">
                Schedule View
                {selectedSchedule && (
                  <span className="ml-2 text-sm text-gray-300">
                    ({selectedSchedule.version === 0 ? "Draft" : `v${selectedSchedule.version}`})
                  </span>
                )}
              </h1>
            </div>

            {showPilotNavigation && (
              <div className="hidden md:flex flex-1 justify-center">
                <span className="text-sm text-gray-300">Welcome, {user.first_name}</span>
              </div>
            )}

            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(getBackButtonDestination())}
                className="border-white text-white hover:bg-white hover:text-black"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{getBackButtonText()}</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Toggle - Only show for pilot view */}
      {showPilotNavigation && (
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
      )}

      {/* Navigation Links - Desktop (always visible) and Mobile (toggleable) - Only show for pilot view */}
      {showPilotNavigation && (
        <nav className={`bg-black border-b border-white ${mobileMenuOpen ? "block" : "hidden"} md:block`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:space-x-8">
              <Button
                variant="ghost"
                className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start md:justify-center"
                onClick={() => router.push("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800 justify-start md:justify-center"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button
                variant="ghost"
                className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start md:justify-center"
                onClick={() => router.push("/options")}
              >
                <Cog className="w-4 h-4 mr-2" />
                Options
              </Button>
              <Button
                variant="ghost"
                className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start md:justify-center"
                disabled
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Trades
              </Button>
              <Button
                variant="ghost"
                className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800 justify-start md:justify-center"
                disabled
              >
                <Plane className="w-4 h-4 mr-2" />
                Time Off
              </Button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="mb-6 bg-black border-white">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-white">Monthly Schedule</CardTitle>

              <div className="flex items-center gap-2">
                {schedules.length > 1 && (
                  <Select value={selectedSchedule?.id.toString()} onValueChange={handleScheduleChange}>
                    <SelectTrigger className="w-[180px] bg-black border-white text-white">
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white text-white">
                      {[...schedules]
                        .sort((a, b) => {
                          if (a.year !== b.year) return a.year - b.year
                          return a.month - b.month
                        })
                        .map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
                            {format(new Date(schedule.year, schedule.month - 1), "MMMM yyyy")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-white">Loading schedule...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-300">No schedules available yet.</p>
                {/* Removed manager-specific create button - managers should use manager dashboard */}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <h2 className="text-xl font-semibold text-white">{format(currentDate, "MMMM yyyy")}</h2>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-sm mb-2 text-white">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {(() => {
  const firstDayOfWeek = daysInMonth[0].getDay()
  const emptyCells = Array.from({ length: firstDayOfWeek }, (_, index) => (
    <div key={`empty-${index}`} className="min-h-[80px]"></div>
  ))
  const dayCells = daysInMonth.map((day, index) => {
                    const dayShifts = getDailyShiftsForDate(day)
                    const dayTraining = getTrainingForDate(day)
                    const isCurrentMonth = isSameMonth(day, currentDate)

                    return (
                      <div
                        key={index}
                        className={`min-h-[80px] border rounded-md p-1 border-white ${
                          !isCurrentMonth ? "bg-gray-100 opacity-50" : ""
                        } ${isToday(day) ? "border-blue-500 border-2" : ""}`}
                      >
                        <div className="text-right text-xs font-medium mb-0.5 text-white">{format(day, "d")}</div>

                        <div className="space-y-0.5 text-xs">
                          {dayShifts.map((shift) => {
                            const shiftDef = shiftDefinitions.find((def) => def.id === shift.shift_definition_id)
                            const pilotNames = shift.pilots.map((pilot) => pilot.last_name).join(", ")

                            // Check if current user is assigned to this shift
                            const isUserAssigned = shift.pilots.some((pilot) => pilot.id === user?.id)

                            return (
                              <div
                                key={shift.id}
                                className={`py-0.5 px-1 rounded flex justify-between items-center h-4 ${
                                  isUserAssigned ? "bg-green-500 text-black" : "bg-white text-black"
                                }`}
                              >
                                <div className="font-semibold text-[9px]">{shiftDef?.shift_letter}</div>
                                <div className="text-[9px] text-right truncate max-w-[80%]">{pilotNames}</div>
                              </div>
                            )
                          })}

                          {dayTraining.length > 0 &&
                            dayTraining.map((training) => {
                              // Check if current user is assigned to this training
                              const isUserAssigned =
                                training.pilots && training.pilots.some((pilot) => pilot.id === user?.id)

                              return (
                                <div
                                  key={training.id}
                                  className={`py-0.5 px-1 rounded flex justify-between items-start min-h-4 ${
                                    isUserAssigned ? "bg-green-500 text-black" : "bg-white text-red-800"
                                  }`}
                                >
                                  <div
                                    className={`font-semibold text-[9px] flex-shrink-0 ${isUserAssigned ? "text-black" : "text-red-800"}`}
                                  >
                                    T
                                  </div>
                                  <div
                                    className={`text-[9px] text-right leading-tight break-words ${isUserAssigned ? "text-black" : "text-red-800"}`}
                                  >
                                    {training.pilots && training.pilots.length > 0
                                      ? training.pilots.map((pilot) => pilot.last_name).join(", ")
                                      : ""}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })
    return [...emptyCells, ...dayCells]
  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
