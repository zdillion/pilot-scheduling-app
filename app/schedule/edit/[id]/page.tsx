"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight, Eye, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
      const response = await fetch(`/api/schedules/${scheduleId}/assignments`) // This endpoint returns both types
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

            // Convert ISO date to YYYY-MM-DD format
            const trainingDate = assignment.training_date.split("T")[0]
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
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "manager") {
        router.push("/dashboard")
        return
      }
      setUser(parsedUser)
      fetchScheduleData()
      fetchPilots()
    } else {
      router.push("/login")
    }
  }, [router, scheduleId])

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
  }, [scheduleId, shiftDefinitions]) // Add shiftDefinitions as dependency

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

      // Fetch schedule details
      const scheduleResponse = await fetch(`/api/schedules/${scheduleId}`)
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        setSchedule(scheduleData.schedule)
        setCurrentDate(new Date(scheduleData.schedule.year, scheduleData.schedule.month - 1, 1))
      } else {
        setError("Failed to fetch schedule details")
      }

      // Fetch shift definitions
      const shiftsResponse = await fetch(`/api/schedules/${scheduleId}/shifts`)
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        setShiftDefinitions(shiftsData.shiftDefinitions)
      } else {
        setError("Failed to fetch shift definitions")
      }

      // Fetch training days
      const trainingResponse = await fetch(`/api/schedules/${scheduleId}/training`)
      if (trainingResponse.ok) {
        const trainingData = await trainingResponse.json()
        setTrainingDays(trainingData.trainingDays || [])
      } else {
        console.error("Failed to fetch training days")
        setTrainingDays([]) // Set to empty array if fetch fails
      }
    } catch (error) {
      console.error("An error occurred while fetching schedule data:", error)
      setError("An error occurred while fetching schedule data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPilots = async () => {
    try {
      const response = await fetch("/api/users/pilots")
      if (response.ok) {
        const data = await response.json()
        setPilots(data.pilots)
      } else {
        setError("Failed to fetch pilots")
      }
    } catch (error) {
      setError("An error occurred while fetching pilots")
    }
  }

  const handleShiftTimeChange = async (shiftId: number, newTime: string) => {
    try {
      const shift = shiftDefinitions.find((s) => s.id === shiftId)
      if (!shift) return

      // Convert 4-digit format (0000) to HH:MM format for API
      let formattedTime = newTime
      if (/^\d{4}$/.test(newTime)) {
        const hours = newTime.substring(0, 2)
        const minutes = newTime.substring(2, 4)
        formattedTime = `${hours}:${minutes}`
      }

      const response = await fetch(`/api/schedules/${scheduleId}/shifts/${shiftId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shift_letter: shift.shift_letter,
          start_time: formattedTime,
          duration_hours: shift.duration_hours,
          pilots_required: shift.pilots_required,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShiftDefinitions((prev) => prev.map((s) => (s.id === shiftId ? data.shiftDefinition : s)))
        toast({
          title: "Shift updated",
          description: `Shift ${shift.shift_letter} start time updated to ${newTime}`,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error updating shift",
          description: errorData.message || "Failed to update shift",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the shift",
        variant: "destructive",
      })
    }
  }

  const handleTimeInputChange = (shiftId: number, value: string) => {
    // Only allow digits and limit to 4 characters
    if (/^\d{0,4}$/.test(value)) {
      // Update the local state immediately for responsive typing
      setShiftTimeInputs((prev) => ({
        ...prev,
        [shiftId]: value,
      }))

      // If we have a complete valid time, update the server
      if (value.length === 4 && validateTimeInput(value)) {
        handleShiftTimeChange(shiftId, value)
      }
    }
  }

  const handleTimeInputBlur = (shiftId: number) => {
    const value = shiftTimeInputs[shiftId] || ""

    // If the value is incomplete when the user leaves the field
    if (value.length > 0 && value.length < 4) {
      // Pad with zeros to make it a valid time
      const paddedValue = value.padStart(4, "0")
      if (validateTimeInput(paddedValue)) {
        // Update both the input and the server
        setShiftTimeInputs((prev) => ({
          ...prev,
          [shiftId]: paddedValue,
        }))
        handleShiftTimeChange(shiftId, paddedValue)
      } else {
        // Reset to the original value if invalid
        const shift = shiftDefinitions.find((s) => s.id === shiftId)
        if (shift) {
          setShiftTimeInputs((prev) => ({
            ...prev,
            [shiftId]: formatTimeForDisplay(shift.start_time),
          }))
        }
      }
    }
  }

  const handleDeleteShift = async (shiftId: number) => {
    if (!confirm("Are you sure you want to delete this shift? This will remove all assignments for this shift.")) return

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/shifts/${shiftId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShiftDefinitions((prev) => prev.filter((s) => s.id !== shiftId))
        setSuccess("Shift deleted successfully")
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to delete shift")
      }
    } catch (error) {
      setError("An error occurred while deleting the shift")
    }
  }

  const handleSlotClick = async (
    slotType: "shift" | "training",
    shiftId?: number,
    trainingId?: number,
    slotIndex?: number,
    date?: Date,
  ) => {
    // Create a unique key for this slot
    const dateStr = date ? format(date, "yyyy-MM-dd") : ""
    const slotKey =
      slotType === "shift"
        ? `shift-${dateStr}-${shiftId}-${slotIndex}`
        : `training-${dateStr}-${trainingId}-${slotIndex}`

    const existingAssignment = assignments[slotKey]

    // If no pilot is selected and there's an existing assignment, remove it
    if (!selectedPilot && existingAssignment) {
      handleClearSlot(slotKey)
      return
    }

    // If the same pilot is already assigned, remove them
    if (selectedPilot && existingAssignment && existingAssignment.pilotId === selectedPilot) {
      handleClearSlot(slotKey)
      return
    }

    // If no pilot is selected and no existing assignment, do nothing
    if (!selectedPilot) {
      toast({
        title: "No pilot selected",
        description: "Please select a pilot from the dropdown first",
        variant: "destructive",
      })
      return
    }

    // Mark this slot as being saved
    setSavingSlots((prev) => new Set(prev).add(slotKey))

    try {
      // Get pilot name for display and actual pilot ID for database
      let pilotName = ""
      let lastName = ""
      let actualPilotId: number | null = null

      const pilot = pilots.find((p) => p.id.toString() === selectedPilot)
      if (pilot) {
        pilotName = `${pilot.first_name} ${pilot.last_name}`
        lastName = pilot.last_name
        actualPilotId = pilot.id // Use the actual pilot ID as a number
      } else {
        pilotName = "Unknown"
        lastName = "Unknown"
        toast({
          title: "Error",
          description: "Selected pilot not found",
          variant: "destructive",
        })
        setSavingSlots((prev) => {
          const newSet = new Set(prev)
          newSet.delete(slotKey)
          return newSet
        })
        return
      }

      // Prepare request body
      const requestBody: any = {
        type: slotType,
        date: dateStr,
        slotIndex: slotIndex,
        pilotId: actualPilotId,
        assignedBy: user?.id,
      }

      if (slotType === "shift") {
        requestBody.shiftId = shiftId
      } else if (slotType === "training") {
        requestBody.trainingId = trainingId
      }

      console.log("Sending assignment request:", requestBody)

      // Save to database
      const response = await fetch(`/api/schedules/${scheduleId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        // Update local state immediately
        setAssignments((prev) => ({
          ...prev,
          [slotKey]: { pilotId: selectedPilot, pilotName: pilotName, lastName: lastName },
        }))

        toast({
          title: "Pilot assigned",
          description: `Assigned ${pilotName} to ${slotType} slot on ${format(date || new Date(), "MMM d")}`,
        })
      } else {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        toast({
          title: "Error assigning pilot",
          description: errorData.message || "Failed to assign pilot",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in handleSlotClick:", error)
      toast({
        title: "Error",
        description: "An error occurred while assigning the pilot",
        variant: "destructive",
      })
    } finally {
      // Remove from saving slots
      setSavingSlots((prev) => {
        const newSet = new Set(prev)
        newSet.delete(slotKey)
        return newSet
      })
    }
  }

  const handleClearSlot = async (slotKey: string) => {
    // Mark this slot as being saved
    setSavingSlots((prev) => new Set(prev).add(slotKey))

    try {
      // Parse the slot key to get the details
      const parts = slotKey.split("-")
      if (parts.length < 5) {
        toast({
          title: "Error",
          description: "Invalid slot format",
          variant: "destructive",
        })
        return
      }

      const slotType = parts[0] // "shift" or "training"
      const dateStr = `${parts[1]}-${parts[2]}-${parts[3]}` // "2025-01-15"
      const id = parts[4] // shift_id or training_id
      const slotIndex = parts[5] // assignment_order

      // Delete from database
      const response = await fetch(`/api/schedules/${scheduleId}/assignments/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: slotType,
          date: dateStr,
          shiftId: slotType === "shift" ? Number.parseInt(id) : undefined,
          trainingId: slotType === "training" ? Number.parseInt(id) : undefined,
          slotIndex: Number.parseInt(slotIndex),
        }),
      })

      if (response.ok) {
        // Remove from local state immediately
        setAssignments((prev) => {
          const newAssignments = { ...prev }
          delete newAssignments[slotKey]
          return newAssignments
        })

        toast({
          title: "Assignment cleared",
          description: "Pilot assignment removed",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error clearing assignment",
          description: errorData.message || "Failed to clear assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while clearing the assignment",
        variant: "destructive",
      })
    } finally {
      // Remove from saving slots
      setSavingSlots((prev) => {
        const newSet = new Set(prev)
        newSet.delete(slotKey)
        return newSet
      })
    }
  }

  const fetchScheduleForMonth = async (month: number, year: number) => {
    try {
      // Find if there's a schedule for this month/year
      const response = await fetch("/api/schedules")
      if (response.ok) {
        const data = await response.json()
        const targetSchedule = data.schedules.find((s: any) => s.month === month && s.year === year)

        if (targetSchedule) {
          // Switch to this schedule
          router.push(`/schedule/edit/${targetSchedule.id}`)
        } else {
          toast({
            title: "No schedule found",
            description: `No schedule exists for ${format(new Date(year, month - 1), "MMMM yyyy")}`,
            variant: "destructive",
          })
          // Reset to original schedule month
          if (schedule) {
            setCurrentDate(new Date(schedule.year, schedule.month - 1, 1))
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check for schedule",
        variant: "destructive",
      })
      // Reset to original schedule month
      if (schedule) {
        setCurrentDate(new Date(schedule.year, schedule.month - 1, 1))
      }
    }
  }

  const previousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    fetchScheduleForMonth(newDate.getMonth() + 1, newDate.getFullYear())
  }

  const nextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    fetchScheduleForMonth(newDate.getMonth() + 1, newDate.getFullYear())
  }

  const handlePreviewSchedule = () => {
    router.push(`/schedule/view?id=${scheduleId}`)
  }

  const handlePublishSchedule = async () => {
    if (!confirm("Are you sure you want to publish this schedule? This will make all changes visible to pilots.")) {
      return
    }

    try {
      setIsPublishing(true)
      const response = await fetch(`/api/schedules/${scheduleId}/publish`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Schedule published",
          description: data.message || "Schedule published successfully",
        })

        // Refresh schedule data to update the UI
        fetchScheduleData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error publishing schedule",
          description: errorData.message || "Failed to publish schedule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error publishing schedule:", error)
      toast({
        title: "Error",
        description: "An error occurred while publishing the schedule",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Check if a day is a training day
  const isTrainingDay = (date: Date) => {
    return trainingDays.some((td) => format(new Date(td.training_date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/schedule/manage")}
                className="border-white text-black bg-white hover:bg-gray-200"
              >
                Back to Schedules
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewSchedule}
                className="border-white text-black bg-white hover:bg-gray-200"
              >
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

        {success && (
          <Alert className="mb-6 bg-green-900 border-green-600 text-green-100">
            <AlertDescription>{success}</AlertDescription>
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
              value="shifts"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              Shift Definitions
            </TabsTrigger>
            <TabsTrigger
              value="training"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              Training Days
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shifts">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="text-white">Shift Definitions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shiftDefinitions.map((shift) => (
                    <div key={shift.id} className="flex items-center space-x-4 p-2 border border-gray-700 rounded-md">
                      <div className="w-12 h-12 flex items-center justify-center bg-blue-900 text-white rounded-md">
                        {shift.shift_letter}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <Label htmlFor={`start-time-${shift.id}`} className="text-white">
                              Start Time
                            </Label>
                            <Input
                              id={`start-time-${shift.id}`}
                              type="text"
                              value={shiftTimeInputs[shift.id] || formatTimeForDisplay(shift.start_time)}
                              onChange={(e) => handleTimeInputChange(shift.id, e.target.value)}
                              onBlur={() => handleTimeInputBlur(shift.id)}
                              placeholder="0000"
                              maxLength={4}
                              className="bg-black border-white text-white w-20"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteShift(shift.id)}
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="text-white">Training Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Label className="text-white mb-4 block">
                    Select multiple days for training. Click days to toggle them on/off.
                  </Label>
                  <h3 className="text-lg font-medium text-white mb-4">
                    {schedule ? format(new Date(schedule.year, schedule.month - 1), "MMMM yyyy") : "Loading..."}
                  </h3>

                  {/* Custom calendar grid */}
                  <div className="border border-gray-600 rounded-lg p-4 bg-gray-900">
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
                        const isTraining = isTrainingDay(day)
                        const dateStr = format(day, "yyyy-MM-dd")

                        return (
                          <button
                            key={index}
                            onClick={() => {
                              if (!isCurrentMonth) return

                              if (isTraining) {
                                // Remove training day
                                const trainingDay = trainingDays.find(
                                  (td) => format(new Date(td.training_date), "yyyy-MM-dd") === dateStr,
                                )
                                if (trainingDay) {
                                  fetch(`/api/schedules/${scheduleId}/training/${trainingDay.id}`, {
                                    method: "DELETE",
                                  })
                                    .then(() => {
                                      // Update local state instead of fetching all data
                                      setTrainingDays((prev) => prev.filter((td) => td.id !== trainingDay.id))
                                      toast({
                                        title: "Training day removed",
                                        description: `Removed training day for ${format(day, "MMM d")}`,
                                      })
                                    })
                                    .catch((error) => {
                                      console.error("Error removing training day:", error)
                                      toast({
                                        title: "Error",
                                        description: "Failed to remove training day",
                                        variant: "destructive",
                                      })
                                    })
                                }
                              } else {
                                // Add training day
                                fetch(`/api/schedules/${scheduleId}/training`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ training_date: dateStr }),
                                })
                                  .then((response) => response.json())
                                  .then((data) => {
                                    // Update local state instead of fetching all data
                                    setTrainingDays((prev) => [...prev, data.trainingDay])
                                    toast({
                                      title: "Training day added",
                                      description: `Added training day for ${format(day, "MMM d")}`,
                                    })
                                  })
                                  .catch((error) => {
                                    console.error("Error adding training day:", error)
                                    toast({
                                      title: "Error",
                                      description: "Failed to add training day",
                                      variant: "destructive",
                                    })
                                  })
                              }
                            }}
                            className={`
                    h-10 w-10 text-sm rounded-md border transition-colors
                    ${
                      !isCurrentMonth
                        ? "text-gray-500 border-gray-700 cursor-not-allowed"
                        : isTraining
                          ? "bg-green-600 text-white border-green-500 hover:bg-green-700"
                          : "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                    }
                    ${isToday(day) ? "ring-2 ring-blue-400" : ""}
                  `}
                            disabled={!isCurrentMonth}
                          >
                            {format(day, "d")}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-gray-400 text-sm">Selected training days: {trainingDays.length}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          // Clear all training days
                          const removePromises = trainingDays.map((trainingDay) =>
                            fetch(`/api/schedules/${scheduleId}/training/${trainingDay.id}`, {
                              method: "DELETE",
                            }),
                          )

                          try {
                            await Promise.all(removePromises)
                            // Update local state instead of fetching all data
                            setTrainingDays([])
                            toast({
                              title: "All training days cleared",
                              description: `Removed ${trainingDays.length} training days`,
                            })
                          } catch (error) {
                            console.error("Error clearing training days:", error)
                            toast({
                              title: "Error",
                              description: "Failed to clear some training days",
                              variant: "destructive",
                            })
                          }
                        }}
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                        disabled={trainingDays.length === 0}
                      >
                        Clear All
                      </Button>
                    </div>
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
                        <SelectContent className="bg-black border-white text-white max-h-[200px] overflow-y-auto data-[highlighted]:text-black">
                          {pilots.map((pilot) => (
                            <SelectItem key={pilot.id} value={pilot.id.toString()}>
                              {pilot.first_name} {pilot.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handlePublishSchedule}
                      disabled={isPublishing}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isPublishing ? "Publishing..." : "Publish Schedule"}
                    </Button>
                      <Button
    onClick={handlePublishSchedule}
    disabled={isPublishing}
    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
  >
    <Save className="w-4 h-4 mr-2" />
    {isPublishing ? "Publishing..." : "Publish Schedule"}
  </Button>
  
  <Button
    onClick={() => {
      // Find training assignments
      const trainingKeys = Object.keys(assignments).filter(k => k.startsWith('training-'));
      console.log("Training assignment keys:", trainingKeys.slice(0, 10));
      
      // Check what IDs are used in the assignments
      const idPattern = /training-\d{4}-\d{2}-\d{2}-(\d+)-\d+/;
      const ids = new Set();
      trainingKeys.forEach(key => {
        const match = key.match(idPattern);
        if (match && match[1]) {
          ids.add(match[1]);
        }
      });
      console.log("Training assignment IDs used:", Array.from(ids));
      
      alert("Check console for training assignments debug");
    }}
    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 ml-2"
  >
    Debug Assignments
  </Button>
</div>
                  </div>

                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">{format(currentDate, "MMMM yyyy")}</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={previousMonth}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth}>
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
                                    const isSaving = savingSlots.has(slotKey)

                                    return (
                                      <div
                                        key={slotIndex}
                                        className={`flex-1 h-5 border border-gray-500 rounded cursor-pointer hover:bg-gray-700 flex items-center justify-center text-[10px] text-white ${
                                          isSaving ? "opacity-50 animate-pulse" : ""
                                        }`}
                                        onClick={() => handleSlotClick("shift", shift.id, undefined, slotIndex, day)}
                                        onContextMenu={(e) => {
                                          e.preventDefault()
                                          if (assignment && !isSaving) {
                                            handleClearSlot(slotKey)
                                          }
                                        }}
                                        title={isSaving ? "Saving..." : "Left click to assign, right click to clear"}
                                      >
                                        {isSaving ? "..." : assignment?.lastName || ""}
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}

                              {/* Training Day */}
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
                                        const isSaving = savingSlots.has(slotKey)

                                        slotsInRow.push(
                                          <div
                                            key={`training-${slotIndex}`}
                                            className={`flex-1 h-5 border border-gray-500 rounded cursor-pointer hover:bg-gray-700 flex items-center justify-center text-[10px] text-white ${
                                              isSaving ? "opacity-50 animate-pulse" : ""
                                            }`}
                                            onClick={() =>
                                              handleSlotClick("training", undefined, trainingDay.id, slotIndex, day)
                                            }
                                            onContextMenu={(e) => {
                                              e.preventDefault()
                                              if (assignment && !isSaving) {
                                                handleClearSlot(slotKey)
                                              }
                                            }}
                                            title={
                                              isSaving ? "Saving..." : "Left click to assign, right click to clear"
                                            }
                                          >
                                            {isSaving ? "..." : assignment?.lastName || ""}
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
                      Click on any slot to assign the selected pilot. Right-click to clear an assignment.
                      <br />
                      All changes are saved immediately.
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
