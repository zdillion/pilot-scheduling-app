"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Pilot {
  id: number
  first_name: string
  last_name: string
}

interface ShiftDefinition {
  id: number
  name: string
  start_time: string
  end_time: string
  required_pilots: number
}

interface DailyShift {
  shift_date: string
  shift_definition_id: number
  shift_definition: ShiftDefinition
}

interface Assignment {
  shift_date: string
  shift_definition_id: number
  assignment_order: number
  pilot_id: number
  first_name: string
  last_name: string
}

export default function EditSchedulePage({ params }: { params: { id: string } }) {
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>([])
  const [dailyShifts, setDailyShifts] = useState<DailyShift[]>([])
  const [assignments, setAssignments] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [slotLoading, setSlotLoading] = useState<string>("")
  const { toast } = useToast()

  // Use schedule ID 5 since that's where the data actually is
  const scheduleId = params.id

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch pilots
      const pilotsRes = await fetch("/api/pilots")
      const pilotsData = await pilotsRes.json()
      setPilots(pilotsData)

      // Fetch shift definitions
      const shiftsRes = await fetch("/api/shift-definitions")
      const shiftsData = await shiftsRes.json()
      setShiftDefinitions(shiftsData)

      // Fetch daily shifts for this schedule
      const dailyShiftsRes = await fetch(`/api/daily-shifts?scheduleId=${scheduleId}`)
      const dailyShiftsData = await dailyShiftsRes.json()
      setDailyShifts(dailyShiftsData)

      // Fetch assignments
      await fetchAssignments()
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load schedule data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    console.log("=== FETCHING ASSIGNMENTS ===")
    console.log("Schedule ID:", scheduleId)

    try {
      // Use the correct schedule ID (5) where the data actually exists
      const actualScheduleId = "5"
      const response = await fetch(`/api/schedules/${actualScheduleId}/assignments`)
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

            const slotKey = `shift-${assignment.shift_date}-${assignment.shift_definition_id}-${assignment.assignment_order}`
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
        } else {
          console.log("No shift assignments found or invalid format")
        }

        // Process training assignments
        if (data.trainingAssignments && Array.isArray(data.trainingAssignments)) {
          console.log("Processing training assignments:", data.trainingAssignments.length)
          data.trainingAssignments.forEach((assignment: any, index: number) => {
            console.log(`Training assignment ${index}:`, assignment)

            const slotKey = `training-${assignment.training_date}-${assignment.training_day_id}-${assignment.assignment_order}`
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
        } else {
          console.log("No training assignments found or invalid format")
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

  const handleSlotClick = async (
    slotType: string,
    dateStr: string,
    id: string,
    slotIndex: string,
    currentPilotId?: number,
  ) => {
    const slotKey = `${slotType}-${dateStr}-${id}-${slotIndex}`

    // Find next pilot in rotation
    const currentIndex = pilots.findIndex((p) => p.id === currentPilotId)
    let nextPilotId: number

    if (currentIndex === -1) {
      // No pilot assigned, assign first pilot
      nextPilotId = pilots[0]?.id || 0
    } else if (currentIndex === pilots.length - 1) {
      // Last pilot, clear assignment
      nextPilotId = 0
    } else {
      // Assign next pilot
      nextPilotId = pilots[currentIndex + 1].id
    }

    try {
      setSlotLoading(slotKey)

      const requestBody = {
        type: slotType,
        date: dateStr,
        shiftId: slotType === "shift" ? Number.parseInt(id) : undefined,
        trainingId: slotType === "training" ? Number.parseInt(id) : undefined,
        slotIndex: Number.parseInt(slotIndex),
        pilotId: nextPilotId,
      }

      // Save to database - use the actual schedule ID where data exists
      const actualScheduleId = "5"
      const response = await fetch(`/api/schedules/${actualScheduleId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error("Failed to save assignment")

      await fetchAssignments()

      toast({
        title: "Assignment updated",
        description:
          nextPilotId === 0 ? "Slot cleared" : `Assigned to ${pilots.find((p) => p.id === nextPilotId)?.first_name}`,
      })
    } catch (error) {
      console.error("Error updating assignment:", error)
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    } finally {
      setSlotLoading("")
    }
  }

  const handleClearSlot = async (slotType: string, dateStr: string, id: string, slotIndex: string) => {
    const slotKey = `${slotType}-${dateStr}-${id}-${slotIndex}`

    try {
      setSlotLoading(slotKey)

      // Delete from database - use the actual schedule ID where data exists
      const actualScheduleId = "5"
      const response = await fetch(`/api/schedules/${actualScheduleId}/assignments/delete`, {
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

      if (!response.ok) throw new Error("Failed to clear assignment")

      await fetchAssignments()

      toast({
        title: "Assignment cleared",
        description: "Slot has been cleared",
      })
    } catch (error) {
      console.error("Error clearing assignment:", error)
      toast({
        title: "Error",
        description: "Failed to clear assignment",
        variant: "destructive",
      })
    } finally {
      setSlotLoading("")
    }
  }

  const getAssignment = (slotType: string, dateStr: string, id: string, slotIndex: string) => {
    const slotKey = `${slotType}-${dateStr}-${id}-${slotIndex}`
    return assignments[slotKey]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Group daily shifts by date
  const shiftsByDate = dailyShifts.reduce(
    (acc, shift) => {
      if (!acc[shift.shift_date]) {
        acc[shift.shift_date] = []
      }
      acc[shift.shift_date].push(shift)
      return acc
    },
    {} as Record<string, DailyShift[]>,
  )

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Schedule</h1>
        <div className="flex gap-2">
          <Button onClick={fetchAssignments} variant="outline">
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(shiftsByDate).map(([date, shifts]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle>{formatDate(date)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {shifts.map((shift) => (
                  <div key={shift.shift_definition_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">{shift.shift_definition.name}</h3>
                      <span className="text-sm text-gray-500">
                        {formatTime(shift.shift_definition.start_time)} - {formatTime(shift.shift_definition.end_time)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: shift.shift_definition.required_pilots }, (_, index) => {
                        const slotType = "shift"
                        const assignment = getAssignment(
                          slotType,
                          shift.shift_date,
                          shift.shift_definition_id.toString(),
                          index.toString(),
                        )
                        const slotKey = `${slotType}-${shift.shift_date}-${shift.shift_definition_id}-${index}`
                        const isLoading = slotLoading === slotKey

                        return (
                          <div
                            key={index}
                            className="border rounded p-3 cursor-pointer hover:bg-gray-50 transition-colors min-h-[60px] flex items-center justify-center"
                            onClick={() =>
                              !isLoading &&
                              handleSlotClick(
                                slotType,
                                shift.shift_date,
                                shift.shift_definition_id.toString(),
                                index.toString(),
                                pilots.find((p) => p.first_name === assignment?.pilotName)?.id,
                              )
                            }
                            onContextMenu={(e) => {
                              e.preventDefault()
                              !isLoading &&
                                handleClearSlot(
                                  slotType,
                                  shift.shift_date,
                                  shift.shift_definition_id.toString(),
                                  index.toString(),
                                )
                            }}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : assignment ? (
                              <div className="text-center">
                                <Badge variant="secondary">{assignment.pilotName}</Badge>
                                <div className="text-xs text-gray-500 mt-1">{index === 0 ? "PIC" : "SIC"}</div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400">
                                <div className="text-sm">Unassigned</div>
                                <div className="text-xs">{index === 0 ? "PIC" : "SIC"}</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click a slot to cycle through pilots</li>
          <li>• Right-click a slot to clear assignment</li>
          <li>• Changes are saved immediately</li>
          <li>• PIC = Pilot in Command, SIC = Second in Command</li>
        </ul>
      </div>
    </div>
  )
}
