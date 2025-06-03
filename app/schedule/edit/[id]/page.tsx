"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight, Eye, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: number
  username: string
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
}

interface ShiftDefinition {
  id: number
  schedule_id: number
  shift_letter: string
  start_time: string
  duration_hours: number
  pilots_required: number
}

interface Pilot {
  id: number
  username: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
}

interface TrainingDay {
  id: number
  training_date: string
  training_name: string
  description?: string
  pilots?: any[]
}

export default function ScheduleEditPage({ params }: { params: { id: string } }) {
  const scheduleId = params.id
  const [user, setUser] = useState<User | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>([])
  const [shiftTimeInputs, setShiftTimeInputs] = useState<{ [key: number]: string }>({})
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [selectedPilot, setSelectedPilot] = useState<string>("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const [isPublishing, setIsPublishing] = useState(false)

  // Single source of truth for assignments - what's actually in the database
  const [assignments, setAssignments] = useState<{
    [key: string]: { pilotId: string; pilotName: string; lastName: string }
  }>({})

  // Track which slots are currently being saved
  const [savingSlots, setSavingSlots] = useState<Set<string>>(new Set())

  // Convert time to 4-digit format (HHMM) for display
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ""

    // Handle various time formats and convert to HHMM
    let cleanTime = timeString.trim()

    // Remove seconds if present (HH:MM:SS -> HH:MM)
    if (cleanTime.includes(":")) {
      const parts = cleanTime.split(":")
      cleanTime = `${parts[0]}:${parts[1]}`
    }

    // Convert HH:MM to HHMM
    if (cleanTime.includes(":")) {
      return cleanTime.replace(":", "")
    }

    // If already in HHMM format, ensure it's 4 digits
    if (/^\d{1,4}$/.test(cleanTime)) {
      return cleanTime.padStart(4, "0")
    }

    return cleanTime
  }

  // Validate 4-digit time input
  const validateTimeInput = (value: string) => {
    if (value.length !== 4) return false
    const hours = Number.parseInt(value.substring(0, 2))
    const minutes = Number.parseInt(value.substring(2, 4))
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
  }

  const fetchAssignments = async () => {
    console.log("=== FETCHING ASSIGNMENTS ===")
    console.log("Schedule ID:", scheduleId)

    try {
      // Use the correct API endpoint that returns both shift and training assignments
      const response = await fetch(`/api/schedules/${scheduleId}/assignments`)
      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Raw API response:", data)

        // Convert database assignments to our local state format
        const loadedAssignments: { [key: string]: { pilotId: string; pilotName: string; lastName: string } } = {}

        // Process shift assignments
        if (data.shiftAssignments && Array.isArray(data.shiftAssignments)) {
          console.log("Processing shift assignments:", data.shiftAssignments.length)
          data.shiftAssignments.forEach((assignment: any, index: number) => {
            console.log(`Shift assignment ${index}:`, assignment)

            const slotKey = `shift-${assignment.shift_date.split("T")[0]}-${assignment.shift_definition_id}-${assignment.assignment_order}`
            const pilotName = `${assignment.first_name} ${assignment.last_name}`

            loadedAssignments[slotKey] = {
              pilotId: assignment.pilot_id.toString(),
              pilotName: pilotName,
              lastName: assignment.last_name,
            }

            console.log(`Created slot key: ${slotKey}`, loadedAssignments[slotKey])
          })
        }

        // Process training assignments
        if (data.trainingAssignments && Array.isArray(data.trainingAssignments)) {
          console.log("Processing training assignments:", data.trainingAssignments.length)
          data.trainingAssignments.forEach((assignment: any, index: number) => {
            console.log(`Training assignment ${index}:`, assignment)

            // FIXED: Use proper date parsing to avoid timezone issues
            const trainingDate = new Date(assignment.training_date).toISOString().split("T")[0]
            const slotKey = `training-${trainingDate}-${assignment.training_day_id}-${assignment.assignment_order}`
            const pilotName = `${assignment.first_name} ${assignment.last_name}`

            // Handle special case for pilot_id = 0 (No PIC/SIC)
            let pilotId = assignment.pilot_id.toString()
            if (assignment.pilot_id === 0) {
              pilotId = assignment.last_name === "PIC" ? "no-pic" : "no-sic"
            }

            loadedAssignments[slotKey] = {
              pilotId: pilotId,
              pilotName: pilotName,
              lastName: assignment.last_name,
            }

            console.log(`Created slot key: ${slotKey}`, loadedAssignments[slotKey])
          })

          // FIXED: Also populate trainingDays state (like the working view page does)
          const processedTrainingDays: TrainingDay[] = []

          // Group training assignments by date and training day
          const groupedTraining = data.trainingAssignments.reduce((acc: any, assignment: any) => {
            const dateKey = new Date(assignment.training_date).toISOString().split("T")[0] // Use same date parsing
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

          console.log("🎉 FIXED: Setting trainingDays state:", processedTrainingDays)
          setTrainingDays(processedTrainingDays)
        }

        console.log("Final processed assignments:", loadedAssignments)
        console.log("Total assignments loaded:", Object.keys(loadedAssignments).length)

        setAssignments(loadedAssignments)
      } else {
        console.error("Failed to fetch assignments, status:", response.status)
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
    }
  }

  useEffect(() => {
    // Mock user data for preview
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } else {
      const mockUser = {
        id: 1,
        username: "manager",
        first_name: "Test",
        last_name: "Manager",
        role: "manager" as const,
      }
      setUser(mockUser)
      localStorage.setItem("user", JSON.stringify(mockUser))
    }

    fetchScheduleData()
    fetchPilots()
  }, [scheduleId])

  // Fetch assignments after schedule data is loaded
  useEffect(() => {
    console.log("=== SCHEDULE EFFECT ===")
    console.log("Schedule ID from params:", scheduleId)

    if (scheduleId && shiftDefinitions.length > 0) {
      console.log("Calling fetchAssignments...")
      fetchAssignments()
    } else {
      console.log("No schedule ID or shift definitions not loaded yet, skipping fetchAssignments")
    }
  }, [scheduleId, shiftDefinitions])

  // Initialize shift time inputs when shift definitions are loaded
  useEffect(() => {
    const initialInputs: { [key: number]: string } = {}
    shiftDefinitions.forEach((shift) => {
      initialInputs[shift.id] = formatTimeForDisplay(shift.start_time)
    })
    setShiftTimeInputs(initialInputs)
  }, [shiftDefinitions])

  const fetchScheduleData = async () => {
    try {
      setIsLoading(true)

      // Mock schedule data for preview
      const mockSchedule = {
        id: 1,
        month: 6, // June 2025
        year: 2025,
        shifts_per_day: 2,
        is_published: false,
      }
      setSchedule(mockSchedule)
      setCurrentDate(new Date(2025, 5, 1)) // June 2025

      // Mock shift definitions
      const mockShifts = [
        { id: 1, schedule_id: 1, shift_letter: "A", start_time: "06:00", duration_hours: 8, pilots_required: 2 },
        { id: 2, schedule_id: 1, shift_letter: "B", start_time: "14:00", duration_hours: 8, pilots_required: 2 },
        { id: 3, schedule_id: 1, shift_letter: "C", start_time: "22:00", duration_hours: 8, pilots_required: 2 },
      ]
      setShiftDefinitions(mockShifts)

      // Don't set mock training days here - let fetchAssignments handle it
      console.log("🚨 AFTER FIX: Not setting mock training days, letting fetchAssignments handle it")
    } catch (error) {
      console.error("An error occurred while fetching schedule data:", error)
      setError("An error occurred while fetching schedule data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPilots = async () => {
    try {
      // Mock pilots data
      const mockPilots = [
        { id: 1, username: "pilot1", first_name: "John", last_name: "Smith", role: "pilot", is_active: true },
        { id: 2, username: "pilot2", first_name: "Jane", last_name: "Doe", role: "pilot", is_active: true },
        { id: 3, username: "pilot3", first_name: "Bob", last_name: "Johnson", role: "pilot", is_active: true },
      ]
      setPilots(mockPilots)
    } catch (error) {
      setError("An error occurred while fetching pilots")
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Check if a day is a training day
  const isTrainingDay = (date: Date) => {
    const result = trainingDays.some(
      (td) => format(new Date(td.training_date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    )
    console.log(
      `🔍 Checking if ${format(date, "yyyy-MM-dd")} is training day:`,
      result,
      "Available training days:",
      trainingDays.map((td) => td.training_date),
    )
    return result
  }

  if (!user || isLoading) {
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">
                Edit Schedule:{" "}
                {schedule ? format(new Date(schedule.year, schedule.month - 1), "MMMM yyyy") : "Loading..."}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="border-white text-black bg-white hover:bg-gray-200">
                Back to Schedules
              </Button>
              <Button variant="outline" size="sm" className="border-white text-black bg-white hover:bg-gray-200">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900 border-red-600 text-red-100">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList className="bg-black border-white">
            <TabsTrigger
              value="assignments"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              Pilot Assignments
            </TabsTrigger>
            <TabsTrigger
              value="debug"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              🔧 Debug Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debug">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="text-white">🔧 Debug Information - Training Assignments Issue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-white">
                  <div>
                    <h3 className="font-semibold text-green-400">✅ Training Days State (After Fix):</h3>
                    <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(trainingDays, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-400">📋 Assignments State:</h3>
                    <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(assignments, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-400">🔍 Training Days Check for June 20, 2025:</h3>
                    <p className="text-lg">
                      {isTrainingDay(new Date(2025, 5, 20)) ? "✅ Is Training Day" : "❌ Not Training Day"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-400">🔍 Training Days Check for June 15, 2025:</h3>
                    <p className="text-lg">
                      {isTrainingDay(new Date(2025, 5, 15)) ? "✅ Is Training Day" : "❌ Not Training Day"}
                    </p>
                  </div>
                  <div className="bg-green-900 p-4 rounded">
                    <h3 className="font-semibold text-green-200">🔧 THE COMPLETE FIX:</h3>
                    <p className="text-green-100">
                      1. Fixed date parsing using `new Date().toISOString().split("T")[0]` for consistent formatting
                    </p>
                    <p className="text-green-100">
                      2. Added trainingDays state population from API response (like the working view page)
                    </p>
                    <p className="text-green-100 mt-2">
                      This ensures both the assignments object AND the trainingDays state are properly populated, so
                      training days show up on the calendar with their assigned pilots.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="text-white">Pilot Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-end justify-between space-x-4">
                    <div className="w-64">
                      <Label htmlFor="selected-pilot" className="text-white">
                        Select Pilot
                      </Label>
                      <Select value={selectedPilot} onValueChange={setSelectedPilot}>
                        <SelectTrigger className="bg-black border-white text-white">
                          <SelectValue placeholder="Select a pilot" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white text-white">
                          {pilots.map((pilot) => (
                            <SelectItem key={pilot.id} value={pilot.id.toString()}>
                              {pilot.first_name} {pilot.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                      <Save className="w-4 h-4 mr-2" />
                      Publish Schedule
                    </Button>
                  </div>

                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">{format(currentDate, "MMMM yyyy")}</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
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
                      {daysInMonth.map((day, index) => {
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const hasTraining = isTrainingDay(day)

                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] border rounded-md p-1 border-white ${
                              !isCurrentMonth ? "bg-gray-900 opacity-50" : ""
                            } ${isToday(day) ? "border-blue-500 border-2" : ""}`}
                          >
                            <div className="text-right text-sm font-medium mb-1 text-white">{format(day, "d")}</div>

                            <div className="space-y-1 text-[10px]">
                              {/* Regular Shifts */}
                              {shiftDefinitions.map((shift) => (
                                <div key={`${day.toISOString()}-${shift.id}`} className="flex items-center gap-1 mb-1">
                                  <div className="font-semibold text-white text-center bg-blue-900 rounded px-1 py-1 w-4 text-[10px]">
                                    {shift.shift_letter}
                                  </div>
                                  {[0, 1].map((slotIndex) => {
                                    const slotKey = `shift-${format(day, "yyyy-MM-dd")}-${shift.id}-${slotIndex}`
                                    const assignment = assignments[slotKey]

                                    return (
                                      <div
                                        key={slotIndex}
                                        className="flex-1 h-5 border border-gray-500 rounded cursor-pointer hover:bg-gray-700 flex items-center justify-center text-[10px] text-white"
                                        title="Click to assign pilot"
                                      >
                                        {assignment?.lastName || ""}
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}

                              {/* Training Day - This should now work with the complete fix! */}
                              {hasTraining && (
                                <div className="space-y-1">
                                  {(() => {
                                    const trainingDay = trainingDays.find(
                                      (td) =>
                                        format(new Date(td.training_date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
                                    )

                                    if (!trainingDay) return null

                                    // Find all assignments for this training day
                                    const trainingAssignments = Object.entries(assignments).filter(([key]) =>
                                      key.startsWith(`training-${format(day, "yyyy-MM-dd")}-${trainingDay.id}-`),
                                    )

                                    // Determine how many slots to show (at least 1, plus 1 extra empty slot if all are filled)
                                    const filledSlots = trainingAssignments.length
                                    const totalSlotsToShow = Math.max(1, filledSlots + 1)

                                    // Group slots into rows of 2
                                    const rows = []
                                    for (let i = 0; i < totalSlotsToShow; i += 2) {
                                      const slotsInRow = []
                                      for (let j = 0; j < 2 && i + j < totalSlotsToShow; j++) {
                                        const slotIndex = i + j
                                        const slotKey = `training-${format(day, "yyyy-MM-dd")}-${trainingDay.id}-${slotIndex}`
                                        const assignment = assignments[slotKey]

                                        slotsInRow.push(
                                          <div
                                            key={`training-${slotIndex}`}
                                            className="flex-1 h-5 border border-gray-500 rounded cursor-pointer hover:bg-gray-700 flex items-center justify-center text-[10px] text-white"
                                            title="Training assignment slot"
                                          >
                                            {assignment?.lastName || ""}
                                          </div>,
                                        )
                                      }
                                      rows.push(slotsInRow)
                                    }

                                    return rows.map((row, rowIndex) => (
                                      <div key={`training-row-${rowIndex}`} className="flex items-center gap-1 mb-1">
                                        {rowIndex === 0 && (
                                          <div className="font-semibold text-white text-center bg-green-900 rounded px-1 py-1 w-4 text-[10px]">
                                            T
                                          </div>
                                        )}
                                        {rowIndex > 0 && <div className="w-4"></div>} {/* Spacer for alignment */}
                                        <div className="flex-1 flex gap-1">{row}</div>
                                      </div>
                                    ))
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                      🎉 Training assignments should now appear on the calendar with "T" indicators AND populated pilot
                      names!
                      <br />
                      Check the Debug Info tab to see the complete fix in action.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
