"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, addMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Calendar, Users, LogOut, ArrowLeft, BarChart3, Home, ArrowLeftRight, CalendarX } from "lucide-react"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
}

export default function ManagerDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
        // Navigate to edit the newly created schedule
        router.push(`/schedule/edit/${data.schedule.id}`)
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

  const handleMonthYearChange = (value: string) => {
    const [month, year] = value.split("-").map(Number)
    setNewSchedule((prev) => ({ ...prev, month, year }))
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
            <h1 className="text-xl font-semibold text-white">Manager Dashboard</h1>
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

      {/* Navigation Links */}
      <nav className="bg-black border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800"
            >
              <Home className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/schedule/manage")}
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

        {/* Notifications Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-black border-white cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ArrowLeftRight className="w-5 h-5 mr-3 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Trade Requests</div>
                      <div className="text-xs text-gray-400">Pending approval</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">--</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black border-white cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarX className="w-5 h-5 mr-3 text-orange-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Day Off Requests</div>
                      <div className="text-xs text-gray-400">Pending approval</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">--</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Management Tools</h2>
          <p className="text-gray-300">Access administrative features and manage the scheduling system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Create Schedule */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-black border-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calendar className="w-5 h-5 mr-2" />
                Create Schedule
              </CardTitle>
              <CardDescription className="text-gray-300">Create new monthly schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-white text-black hover:bg-gray-200">Create Month</Button>
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
            </CardContent>
          </Card>

          {/* Manage Schedules */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-black border-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calendar className="w-5 h-5 mr-2" />
                Manage Schedules
              </CardTitle>
              <CardDescription className="text-gray-300">Edit and view existing schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-white text-black hover:bg-gray-200"
                onClick={() => router.push("/schedule/manage")}
              >
                Manage Schedules
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-black border-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="w-5 h-5 mr-2" />
                User Management
              </CardTitle>
              <CardDescription className="text-gray-300">Manage pilots, viewers, and managers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-white text-black hover:bg-gray-200" onClick={() => router.push("/users")}>
                Manage Users
              </Button>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-black border-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <BarChart3 className="w-5 h-5 mr-2" />
                Reports
              </CardTitle>
              <CardDescription className="text-gray-300">View scheduling reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full border-white text-white hover:bg-white hover:text-black"
                variant="outline"
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
