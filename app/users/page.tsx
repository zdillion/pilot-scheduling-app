"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Eye, UserCheck, ArrowLeft, Users, LogOut, BarChart3, Home, Calendar } from "lucide-react"

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "manager" | "pilot" | "viewer"
  is_active: boolean
}

export default function UserManagementPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    user_type: "pilot" as "pilot" | "viewer",
    has_manager_access: false,
  })

  // Edit user form state
  const [editUser, setEditUser] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    user_type: "pilot" as "pilot" | "viewer",
    has_manager_access: false,
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role !== "manager") {
        router.push("/dashboard")
        return
      }
      setCurrentUser(user)
      fetchUsers()
    } else {
      router.push("/login")
    }
  }, [router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/pilots")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.pilots || []) // Add fallback to empty array
      } else {
        setError("Failed to fetch users")
        setUsers([]) // Set empty array on error
      }
    } catch (error) {
      setError("Error fetching users")
      setUsers([]) // Set empty array on error
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const role = newUser.has_manager_access ? "manager" : newUser.user_type

      const response = await fetch("/api/pilots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: role,
        }),
      })

      if (response.ok) {
        setSuccess("User created successfully")
        setNewUser({
          username: "",
          password: "",
          first_name: "",
          last_name: "",
          user_type: "pilot",
          has_manager_access: false,
        })
        setIsCreateDialogOpen(false)
        fetchUsers()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to create user")
      }
    } catch (error) {
      setError("An error occurred while creating the user")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const role = editUser.has_manager_access ? "manager" : editUser.user_type

      const response = await fetch(`/api/pilots/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editUser.username,
          password: editUser.password,
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          role: role,
        }),
      })

      if (response.ok) {
        setSuccess("User updated successfully")
        setIsEditDialogOpen(false)
        setEditingUser(null)
        fetchUsers()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to update user")
      }
    } catch (error) {
      setError("An error occurred while updating the user")
    } finally {
      setIsLoading(false)
    }
  }

  const handleManagerAccessChange = async (userId: number, hasManagerAccess: boolean) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      // Determine the base user type (pilot or viewer)
      const baseType = user.role === "viewer" ? "viewer" : "pilot"
      const newRole = hasManagerAccess ? "manager" : baseType

      const response = await fetch(`/api/pilots/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          role: newRole,
        }),
      })

      if (response.ok) {
        setSuccess(`Manager access ${hasManagerAccess ? "granted" : "removed"}`)
        fetchUsers()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to update manager access")
      }
    } catch (error) {
      setError("An error occurred while updating manager access")
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/pilots/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("User deleted successfully")
        fetchUsers()
      } else {
        setError("Failed to delete user")
      }
    } catch (error) {
      setError("Error deleting user")
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditUser({
      username: user.username,
      password: "", // Don't pre-fill password for security
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.role === "viewer" ? "viewer" : "pilot",
      has_manager_access: user.role === "manager",
    })
    setIsEditDialogOpen(true)
  }

  // Filter users by role - add safety check
  const pilots = users?.filter((user) => user.role === "pilot" || user.role === "manager") || []
  const viewers = users?.filter((user) => user.role === "viewer") || []

  const UserTable = ({
    userList,
    showManagerColumn = true,
  }: {
    userList: User[]
    showManagerColumn?: boolean
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-white">Name</TableHead>
          {showManagerColumn && <TableHead className="text-white">Manager Access</TableHead>}
          <TableHead className="text-white">Status</TableHead>
          <TableHead className="text-white">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {userList?.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium text-white">
              {user.first_name} {user.last_name}
            </TableCell>
            {showManagerColumn && (
              <TableCell>
                <Checkbox
                  checked={user.role === "manager"}
                  onCheckedChange={(checked) => handleManagerAccessChange(user.id, checked as boolean)}
                />
              </TableCell>
            )}
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(user)}
                  className="bg-black border-white text-white hover:bg-white hover:text-black"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                  className="text-red-400 border-red-400 hover:bg-red-400 hover:text-black"
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) || []}
      </TableBody>
    </Table>
  )

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (!currentUser || isLoading) {
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
            <h1 className="text-xl font-semibold text-white">User Management</h1>
            <div className="flex-1 flex justify-center">
              <span className="text-sm text-gray-300">Welcome, {currentUser.first_name}</span>
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
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-300 hover:bg-gray-800"
              onClick={() => router.push("/schedule/manage")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Management
            </Button>
            <Button
              variant="ghost"
              className="flex items-center px-3 py-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400 hover:bg-gray-800"
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

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New User</DialogTitle>
                <DialogDescription className="text-gray-300">Add a new user to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-white">
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      required
                      className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-white">
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      required
                      className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                    placeholder="Unique username for login"
                    className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    placeholder="Initial password"
                    className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_type" className="text-white">
                    User Type
                  </Label>
                  <Select
                    value={newUser.user_type}
                    onValueChange={(value: "pilot" | "viewer") => setNewUser({ ...newUser, user_type: value })}
                  >
                    <SelectTrigger className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white text-white">
                      <SelectItem value="pilot" className="text-white">
                        Pilot
                      </SelectItem>
                      <SelectItem value="viewer" className="text-white">
                        Viewer
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manager_access"
                    checked={newUser.has_manager_access}
                    onCheckedChange={(checked) => setNewUser({ ...newUser, has_manager_access: checked as boolean })}
                  />
                  <Label htmlFor="manager_access" className="text-white">
                    Grant Manager Access
                  </Label>
                </div>

                <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pilots" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-black border-white">
            <TabsTrigger
              value="pilots"
              className="flex items-center bg-black border-white text-white hover:bg-white hover:text-black data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Pilots ({pilots.length})
            </TabsTrigger>
            <TabsTrigger
              value="viewers"
              className="flex items-center bg-black border-white text-white hover:bg-white hover:text-black data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Eye className="w-4 h-4 mr-2" />
              Viewers ({viewers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pilots">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Pilots
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Users who can be assigned to shifts. Check the box to grant manager access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pilots.length === 0 ? (
                  <div className="text-center py-8 text-gray-300">
                    No pilots found. Create your first pilot to get started.
                  </div>
                ) : (
                  <UserTable userList={pilots} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="viewers">
            <Card className="bg-black border-white">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Eye className="w-5 h-5 mr-2" />
                  Viewers
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Users who can view schedules but cannot be assigned to shifts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewers.length === 0 ? (
                  <div className="text-center py-8 text-gray-300">
                    No viewers found. Viewers can see schedules but cannot be assigned shifts.
                  </div>
                ) : (
                  <UserTable userList={viewers} showManagerColumn={false} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-black border-white">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User</DialogTitle>
              <DialogDescription className="text-gray-300">Update user information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name" className="text-white">
                    First Name
                  </Label>
                  <Input
                    id="edit_first_name"
                    value={editUser.first_name}
                    onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                    required
                    className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name" className="text-white">
                    Last Name
                  </Label>
                  <Input
                    id="edit_last_name"
                    value={editUser.last_name}
                    onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                    required
                    className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_username" className="text-white">
                  Username
                </Label>
                <Input
                  id="edit_username"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  required
                  className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_password" className="text-white">
                  New Password (leave blank to keep current)
                </Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  placeholder="Enter new password or leave blank"
                  className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_user_type" className="text-white">
                  User Type
                </Label>
                <Select
                  value={editUser.user_type}
                  onValueChange={(value: "pilot" | "viewer") => setEditUser({ ...editUser, user_type: value })}
                >
                  <SelectTrigger className="bg-black border-white text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white text-white">
                    <SelectItem value="pilot" className="text-white">
                      Pilot
                    </SelectItem>
                    <SelectItem value="viewer" className="text-white">
                      Viewer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_manager_access"
                  checked={editUser.has_manager_access}
                  onCheckedChange={(checked) => setEditUser({ ...editUser, has_manager_access: checked as boolean })}
                />
                <Label htmlFor="edit_manager_access" className="text-white">
                  Grant Manager Access
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 border-white text-white hover:bg-white hover:text-black"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
