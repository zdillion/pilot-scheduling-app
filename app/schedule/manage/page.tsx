"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Eye, Trash2, Calendar, ArrowLeft, Users, LogOut, BarChart3, Home } from "lucide-react"

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
  version: number
  created_by: number
}

export default function ScheduleManagePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // New schedule form state
  const [newSchedule, setNewSchedule] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    shifts_per_day: 3,
  })

  // Available months for selection (current month + 11 future months)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i)
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: format(date, "MMMM yyyy"),
    }
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "manager") {
        router.push("/dashboard")
        return
      }
      setUser(parsedUser)
    } else {
      router.push("/login")
    }
  }, [router])

  // Separate useEffect for fetching schedules after user is set
  useEffect(() => {
    if (user) {
      fetchSchedules()
    }
  }, [user])

  const fetchSchedules = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/schedules?userRole=${user.role}`)
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules)
      } else {
        setError("Failed to fetch schedules")
      }
    } catch (error) {
      setError("Error fetching schedules")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newSchedule,
          created_by: user?.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(
          `Schedule for ${format(new Date(newSchedule.year, newSchedule.month - 1), "MMMM yyyy")} created successfully with ${newSchedule.shifts_per_day} default shifts`,
        )
        setIsCreateDialogOpen(false)
        setNewSchedule({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          shifts_per_day: 3,
        })
        fetchSchedules()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to create schedule")
      }
    } catch (error) {
      setError("An error occurred while creating the schedule")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/schedules/${id}/delete`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("Schedule deleted successfully")
        fetchSchedules()
      } else {
        setError("Failed to delete schedule")
      }
    } catch (error) {
      setError("Error deleting schedule")
    }
  }

  const handlePublishSchedule = async (id: number) => {
    try {
      const response = await fetch(`/api/schedules/${id}/publish`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message || "Schedule published successfully")
        fetchSchedules()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to publish schedule")
      }
    } catch (error) {
      setError("An error occurred while publishing the schedule")
    }
  }

  const handleMonthYearChange = (value: string) => {
    const [month, year] = value.split("-").map(Number)
    setNewSchedule((prev) => ({ ...prev, month, year }))
  }

  const getVersionDisplay = (schedule: Schedule) => {
    if (schedule.version === 0) {
      return "Draft"
    }
    return `v${schedule.version}`
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-black shadow-sm border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-semibold text-white">Schedule Management</h1>
            <div className="flex-1 flex justify-center">
              <span className="text-sm text-gray-300">Welcome, {user.first_name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="border-white text-white hover:bg-white hover:text-black"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Pilot Dashboard
              </Button>
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

      {/* Manager Navigation Links */}
      <nav className="bg-black border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/manager")}
            >
              <Home className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Management
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/users")}
            >
              <Users className="w-4 h-4 mr-2" />
              User Management
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              disabled
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </nav>

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

        <div className="flex justify-end mb-6">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-gray-200">
                <Plus className="w-4 h-4 mr-2" />
                Create New Month
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Monthly Schedule</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Set up a new monthly schedule with default shifts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="month-year" className="text-white">
                    Month & Year
                  </Label>
                  <Select value={`${newSchedule.month}-${newSchedule.year}`} onValueChange={handleMonthYearChange}>
                    <SelectTrigger className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue placeholder="Select month and year" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white text-white">
                      {availableMonths.map((date) => (
                        <SelectItem key={`${date.month}-${date.year}`} value={`${date.month}-${date.year}`}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shifts_per_day" className="text-white">
                    Number of Shifts
                  </Label>
                  <Select
                    value={newSchedule.shifts_per_day.toString()}
                    onValueChange={(value) =>
                      setNewSchedule({ ...newSchedule, shifts_per_day: Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue placeholder="Select number of shifts" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white text-white">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? "shift" : "shifts"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Default shifts (A, B, C, etc.) will be created automatically. You can customize them later.
                  </p>
                </div>

                <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Schedule"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-black border-white">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Calendar className="w-5 h-5 mr-2" />
              Monthly Schedules
            </CardTitle>
            <CardDescription className="text-gray-300">
              Manage all monthly schedules. Create, edit, view, and publish schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-300">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                No schedules found. Create your first monthly schedule to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white">Month & Year</TableHead>
                    <TableHead className="text-white">Shifts Per Day</TableHead>
                    <TableHead className="text-white">Version</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules
                    .sort((a, b) => {
                      // Sort by year first, then by month (ascending order for chronological)
                      if (a.year !== b.year) return a.year - b.year
                      return a.month - b.month
                    })
                    .map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium text-white">
                          {format(new Date(schedule.year, schedule.month - 1), "MMMM yyyy")}
                        </TableCell>
                        <TableCell className="text-white">{schedule.shifts_per_day}</TableCell>
                        <TableCell className="text-white">{getVersionDisplay(schedule)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              schedule.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {schedule.is_published ? "Published" : "Draft"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/schedule/view?id=${schedule.id}`)}
                              className="bg-black border-white text-white hover:bg-white hover:text-black"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/schedule/edit/${schedule.id}`)}
                              className="bg-black border-white text-white hover:bg-white hover:text-black"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {!schedule.is_published && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePublishSchedule(schedule.id)}
                                className="bg-green-600 border-green-600 text-white hover:bg-green-700"
                              >
                                Publish
                              </Button>
                            )}
                            {schedule.is_published && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePublishSchedule(schedule.id)}
                                className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                              >
                                Republish
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-400 border-red-400 hover:bg-red-400 hover:text-black"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
