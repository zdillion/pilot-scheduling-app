"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Assignment {
  id: number
  shift_date: string
  shift_definition_id: number
  assignment_order: number
  pilot_id: number
  first_name: string
  last_name: string
}

export default function SimpleEditPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Always use schedule ID 5 where the data exists
  const scheduleId = "5"

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      console.log("Fetching assignments...")

      const response = await fetch(`/api/assignments/${scheduleId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Assignments data:", data)
      setAssignments(data)

      toast({
        title: "Assignments loaded",
        description: `Found ${data.length} assignments`,
      })
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Group assignments by date and shift
  const groupedAssignments = assignments.reduce(
    (acc, assignment) => {
      const dateKey = assignment.shift_date
      const shiftKey = assignment.shift_definition_id

      if (!acc[dateKey]) {
        acc[dateKey] = {}
      }

      if (!acc[dateKey][shiftKey]) {
        acc[dateKey][shiftKey] = []
      }

      acc[dateKey][shiftKey].push(assignment)
      return acc
    },
    {} as Record<string, Record<number, Assignment[]>>,
  )

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Simple Schedule Editor</h1>
        <Button onClick={fetchAssignments}>
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh Assignments
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center p-10 border rounded-lg">
          <p className="text-xl">No assignments found</p>
          <p className="text-gray-500 mt-2">Try refreshing or adding some assignments</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssignments).map(([date, shifts]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle>{formatDate(date)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(shifts).map(([shiftId, shiftAssignments]) => (
                    <div key={shiftId} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Shift ID: {shiftId}</h3>
                      <div className="space-y-2">
                        {shiftAssignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">
                                {assignment.first_name} {assignment.last_name}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">
                                (Position: {assignment.assignment_order === 0 ? "PIC" : "SIC"})
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">ID: {assignment.id}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Information:</h3>
        <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
          {JSON.stringify({ scheduleId, assignmentCount: assignments.length }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
