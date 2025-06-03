"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Mail,
  MessageSquare,
  User,
  Home,
  CalendarDays,
  Cog,
  ArrowLeftRight,
  Plane,
  LogOut,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PWANotificationToggle } from "@/components/pwa-notification-toggle"
import { isPushNotificationSupported } from "@/lib/pwa-utils"

interface ContactInfo {
  email: string
  phone: string
}

interface NotificationPreferences {
  newSchedulePublished: {
    enabled: boolean
    email: boolean
    inApp: boolean
    sms: boolean
    push?: boolean
  }
  scheduleChanges: {
    enabled: boolean
    email: boolean
    inApp: boolean
    sms: boolean
    push?: boolean
  }
  shiftReminders: {
    enabled: boolean
    email: boolean
    inApp: boolean
    sms: boolean
    push?: boolean
    timing: {
      hours24: boolean
      hours2: boolean
      minutes30: boolean
    }
  }
}

export default function OptionsPage() {
  const [user, setUser] = useState<any | null>(null)
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: "",
    phone: "",
  })
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newSchedulePublished: {
      enabled: true,
      email: true,
      inApp: true,
      sms: false,
      push: false,
    },
    scheduleChanges: {
      enabled: true,
      email: true,
      inApp: true,
      sms: false,
      push: false,
    },
    shiftReminders: {
      enabled: true,
      email: true,
      inApp: true,
      sms: false,
      push: false,
      timing: {
        hours24: true,
        hours2: true,
        minutes30: false,
      },
    },
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({})
  const [pushSupported, setPushSupported] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchUserProfile(parsedUser.id)
    } else {
      router.push("/login")
    }

    // Check if push notifications are supported
    setPushSupported(isPushNotificationSupported())
  }, [router])

  const fetchUserProfile = async (userId: number) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/user/profile", {
        headers: {
          "x-user-id": userId.toString(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        setContactInfo(data.contactInfo)

        // Add push notification preferences if they don't exist
        const updatedPreferences = {
          ...data.preferences,
          newSchedulePublished: {
            ...data.preferences.newSchedulePublished,
            push: data.preferences.newSchedulePublished.push ?? false,
          },
          scheduleChanges: {
            ...data.preferences.scheduleChanges,
            push: data.preferences.scheduleChanges.push ?? false,
          },
          shiftReminders: {
            ...data.preferences.shiftReminders,
            push: data.preferences.shiftReminders.push ?? false,
          },
        }

        setPreferences(updatedPreferences)
      } else {
        console.error("Failed to fetch user profile")
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    // Basic phone validation - allows various formats
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
    return phone === "" || phoneRegex.test(phone.replace(/[\s\-()]/g, ""))
  }

  const handleContactInfoChange = (field: keyof ContactInfo, value: string) => {
    setContactInfo((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handleToggleCategory = (category: keyof NotificationPreferences, enabled: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        enabled,
      },
    }))
  }

  const handleToggleMethod = (
    category: keyof NotificationPreferences,
    method: "email" | "inApp" | "sms" | "push",
    enabled: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [method]: enabled,
      },
    }))
  }

  const handleToggleTiming = (timing: "hours24" | "hours2" | "minutes30", enabled: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      shiftReminders: {
        ...prev.shiftReminders,
        timing: {
          ...prev.shiftReminders.timing,
          [timing]: enabled,
        },
      },
    }))
  }

  const handleSaveAll = async () => {
    if (!user) return

    // Validate contact information
    const newErrors: { email?: string; phone?: string } = {}

    if (!contactInfo.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(contactInfo.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (contactInfo.phone && !validatePhone(contactInfo.phone)) {
      newErrors.phone = "Please enter a valid phone number"
    }

    // Check if SMS is enabled but no phone number provided
    const smsEnabled =
      preferences.newSchedulePublished.sms || preferences.scheduleChanges.sms || preferences.shiftReminders.sms

    if (smsEnabled && !contactInfo.phone) {
      newErrors.phone = "Phone number is required for SMS notifications"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({ contactInfo, preferences }),
      })

      if (response.ok) {
        setSuccess("Contact information and notification preferences saved successfully")
      } else {
        const errorData = await response.json()
        setErrors({ email: errorData.message || "Failed to save preferences" })
      }
    } catch (error) {
      setErrors({ email: "An error occurred while saving preferences" })
    } finally {
      setIsSaving(false)
    }

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
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
          <div className="flex items-center h-16">
            <h1 className="text-xl font-semibold text-white">Options</h1>
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

      {/* Navigation Links */}
      <nav className="bg-black border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/schedule/view")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800"
            >
              <Cog className="w-4 h-4 mr-2" />
              Options
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              disabled
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Trades
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              disabled
            >
              <Plane className="w-4 h-4 mr-2" />
              Time Off
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {success && (
          <Alert className="mb-6 bg-green-900 border-green-600 text-green-100">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Contact Information Card */}
        <Card className="bg-black border-white mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Contact Information
            </CardTitle>
            <CardDescription className="text-gray-300">
              Update your contact details for receiving notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => handleContactInfoChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  className={`bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400 ${
                    errors.email ? "border-red-500" : ""
                  }`}
                />
                {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">
                  Phone Number
                  {(preferences.newSchedulePublished.sms ||
                    preferences.scheduleChanges.sms ||
                    preferences.shiftReminders.sms) && <span className="text-red-400 ml-1">*</span>}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => handleContactInfoChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={`bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400 ${
                    errors.phone ? "border-red-500" : ""
                  }`}
                />
                {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
                <p className="text-xs text-gray-400">Required for SMS notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
        <Card className="bg-black border-white mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-gray-300">
              Manage how you receive notifications about schedules and shifts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Schedule Published */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">New Schedule Published</h3>
                  <p className="text-sm text-gray-400">Get notified when a new schedule is published</p>
                </div>
                <Switch
                  checked={preferences.newSchedulePublished.enabled}
                  onCheckedChange={(checked) => handleToggleCategory("newSchedulePublished", checked)}
                />
              </div>

              {preferences.newSchedulePublished.enabled && (
                <div className="ml-6 space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-schedule-email"
                      checked={preferences.newSchedulePublished.email}
                      onCheckedChange={(checked) => handleToggleMethod("newSchedulePublished", "email", checked)}
                    />
                    <Label htmlFor="new-schedule-email" className="text-white flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-schedule-inapp"
                      checked={preferences.newSchedulePublished.inApp}
                      onCheckedChange={(checked) => handleToggleMethod("newSchedulePublished", "inApp", checked)}
                    />
                    <Label htmlFor="new-schedule-inapp" className="text-white flex items-center">
                      <Bell className="w-4 h-4 mr-2" />
                      In-app
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-schedule-sms"
                      checked={preferences.newSchedulePublished.sms}
                      onCheckedChange={(checked) => handleToggleMethod("newSchedulePublished", "sms", checked)}
                    />
                    <Label htmlFor="new-schedule-sms" className="text-white flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      SMS
                    </Label>
                  </div>

                  {pushSupported && (
                    <PWANotificationToggle
                      defaultEnabled={preferences.newSchedulePublished.push}
                      onChange={(enabled) => handleToggleMethod("newSchedulePublished", "push", enabled)}
                    />
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-gray-700" />

            {/* Schedule Changes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Schedule Changes</h3>
                  <p className="text-sm text-gray-400">Get notified when there are updates to the schedule</p>
                </div>
                <Switch
                  checked={preferences.scheduleChanges.enabled}
                  onCheckedChange={(checked) => handleToggleCategory("scheduleChanges", checked)}
                />
              </div>

              {preferences.scheduleChanges.enabled && (
                <div className="ml-6 space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-changes-email"
                      checked={preferences.scheduleChanges.email}
                      onCheckedChange={(checked) => handleToggleMethod("scheduleChanges", "email", checked)}
                    />
                    <Label htmlFor="schedule-changes-email" className="text-white flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-changes-inapp"
                      checked={preferences.scheduleChanges.inApp}
                      onCheckedChange={(checked) => handleToggleMethod("scheduleChanges", "inApp", checked)}
                    />
                    <Label htmlFor="schedule-changes-inapp" className="text-white flex items-center">
                      <Bell className="w-4 h-4 mr-2" />
                      In-app
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-changes-sms"
                      checked={preferences.scheduleChanges.sms}
                      onCheckedChange={(checked) => handleToggleMethod("scheduleChanges", "sms", checked)}
                    />
                    <Label htmlFor="schedule-changes-sms" className="text-white flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      SMS
                    </Label>
                  </div>

                  {pushSupported && (
                    <PWANotificationToggle
                      defaultEnabled={preferences.scheduleChanges.push}
                      onChange={(enabled) => handleToggleMethod("scheduleChanges", "push", enabled)}
                    />
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-gray-700" />

            {/* Shift Reminders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Shift Reminders</h3>
                  <p className="text-sm text-gray-400">Get reminders before your scheduled shifts</p>
                </div>
                <Switch
                  checked={preferences.shiftReminders.enabled}
                  onCheckedChange={(checked) => handleToggleCategory("shiftReminders", checked)}
                />
              </div>

              {preferences.shiftReminders.enabled && (
                <div className="ml-6 space-y-5 pt-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Delivery Methods</h4>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-email"
                        checked={preferences.shiftReminders.email}
                        onCheckedChange={(checked) => handleToggleMethod("shiftReminders", "email", checked)}
                      />
                      <Label htmlFor="shift-reminders-email" className="text-white flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-inapp"
                        checked={preferences.shiftReminders.inApp}
                        onCheckedChange={(checked) => handleToggleMethod("shiftReminders", "inApp", checked)}
                      />
                      <Label htmlFor="shift-reminders-inapp" className="text-white flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        In-app
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-sms"
                        checked={preferences.shiftReminders.sms}
                        onCheckedChange={(checked) => handleToggleMethod("shiftReminders", "sms", checked)}
                      />
                      <Label htmlFor="shift-reminders-sms" className="text-white flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS
                      </Label>
                    </div>

                    {pushSupported && (
                      <PWANotificationToggle
                        defaultEnabled={preferences.shiftReminders.push}
                        onChange={(enabled) => handleToggleMethod("shiftReminders", "push", enabled)}
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Reminder Timing</h4>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-24h"
                        checked={preferences.shiftReminders.timing.hours24}
                        onCheckedChange={(checked) => handleToggleTiming("hours24", checked)}
                      />
                      <Label htmlFor="shift-reminders-24h" className="text-white">
                        24 hours before shift
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-2h"
                        checked={preferences.shiftReminders.timing.hours2}
                        onCheckedChange={(checked) => handleToggleTiming("hours2", checked)}
                      />
                      <Label htmlFor="shift-reminders-2h" className="text-white">
                        2 hours before shift
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shift-reminders-30m"
                        checked={preferences.shiftReminders.timing.minutes30}
                        onCheckedChange={(checked) => handleToggleTiming("minutes30", checked)}
                      />
                      <Label htmlFor="shift-reminders-30m" className="text-white">
                        30 minutes before shift
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveAll} className="bg-white text-black hover:bg-gray-200" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </main>
    </div>
  )
}
