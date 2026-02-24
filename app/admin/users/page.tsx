"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  Shield,
  UserCircle,
  Mail,
  Calendar,
  MoreVertical,
  Eye,
  Plus,
  Trash2,
  Settings,
  UserPlus,
  X,
  Loader2,
  AlertTriangle,
  KeyRound,
  EyeOff,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  canManageUsers: boolean;
  canManageAppointments: boolean;
  canManageArticles: boolean;
  canManageSettings: boolean;
  canViewAllPatients: boolean;
  canCreateClinicalNotes: boolean;
  createdAt: string;
  _count?: {
    patientAppointments: number;
    soapNotesFor: number;
  };
}

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("staff");
  const { toast } = useToast();

  // Modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // New staff form
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "THERAPIST",
    canManageUsers: false,
    canManageAppointments: true,
    canManageArticles: false,
    canManageSettings: false,
    canViewAllPatients: true,
    canCreateClinicalNotes: true,
  });

  // Permissions form
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canManageAppointments: true,
    canManageArticles: false,
    canManageSettings: false,
    canViewAllPatients: true,
    canCreateClinicalNotes: true,
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const createStaff = async () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });

      if (res.ok) {
        const user = await res.json();
        setUsers([user, ...users]);
        setShowAddStaffModal(false);
        setNewStaff({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          role: "THERAPIST",
          canManageUsers: false,
          canManageAppointments: true,
          canManageArticles: false,
          canManageSettings: false,
          canViewAllPatients: true,
          canCreateClinicalNotes: true,
        });
        toast({
          title: "Staff member created",
          description: `${user.firstName} ${user.lastName} has been added.`,
        });
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Failed to create staff member.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create staff member.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePermissions = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, ...updatedUser } : u)));
        setShowPermissionsModal(false);
        toast({
          title: "Permissions updated",
          description: `Permissions for ${selectedUser.firstName} have been updated.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update permissions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update permissions.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        toast({
          title: "Role updated",
          description: `User role has been changed to ${newRole}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(users.filter((u) => u.id !== selectedUser.id));
        setShowDeleteDialog(false);
        toast({
          title: "User deleted",
          description: `${selectedUser.firstName} ${selectedUser.lastName} has been removed.`,
        });
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        setShowPasswordModal(false);
        setNewPassword("");
        toast({
          title: "Password Updated",
          description: `Password for ${selectedUser.firstName} ${selectedUser.lastName} has been reset.`,
        });
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Failed to reset password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePassword = async (user: User) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removePassword: true }),
      });

      if (res.ok) {
        toast({
          title: "Password Removed",
          description: `Password for ${user.firstName} ${user.lastName} has been deleted. They will need a new one to log in.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setPermissions({
      canManageUsers: user.canManageUsers,
      canManageAppointments: user.canManageAppointments,
      canManageArticles: user.canManageArticles,
      canManageSettings: user.canManageSettings,
      canViewAllPatients: user.canViewAllPatients,
      canCreateClinicalNotes: user.canCreateClinicalNotes,
      isActive: user.isActive,
    });
    setShowPermissionsModal(true);
  };

  const staffUsers = users.filter((u) => u.role === "ADMIN" || u.role === "THERAPIST");
  const patientUsers = users.filter((u) => u.role === "PATIENT");

  const filteredStaff = staffUsers.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPatients = patientUsers.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700";
      case "THERAPIST":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{T("admin.userManagementTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {T("admin.userManagementDesc")}
          </p>
        </div>
        <Button onClick={() => setShowAddStaffModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg w-fit">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {users.filter((u) => u.role === "ADMIN").length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg w-fit">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {users.filter((u) => u.role === "THERAPIST").length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Therapists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg w-fit">
                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {users.filter((u) => u.role === "PATIENT").length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff" className="gap-2">
            <Shield className="h-4 w-4" />
            Staff ({staffUsers.length})
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Patients ({patientUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-32 mb-2" />
                        <div className="h-3 bg-muted rounded w-48" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No staff members found</p>
                <Button
                  onClick={() => setShowAddStaffModal(true)}
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((user) => (
                <Card key={user.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                            {!user.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionsModal(user)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Permissions
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "THERAPIST")}
                              disabled={user.role === "THERAPIST"}
                            >
                              Set as Therapist
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "ADMIN")}
                              disabled={user.role === "ADMIN"}
                            >
                              Set as Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openPasswordModal(user)}
                            >
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => removePassword(user)}
                            >
                              <EyeOff className="h-4 w-4 mr-2" />
                              Delete Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-32 mb-2" />
                        <div className="h-3 bg-muted rounded w-48" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No patients found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((user) => (
                <Card key={user.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined{" "}
                              {new Date(user.createdAt).toLocaleDateString("en-GB", {
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/patients/${user.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "THERAPIST")}
                            >
                              Promote to Therapist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openPasswordModal(user)}
                            >
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => removePassword(user)}
                            >
                              <EyeOff className="h-4 w-4 mr-2" />
                              Delete Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Staff Modal */}
      <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new therapist or admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newStaff.firstName}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newStaff.lastName}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newStaff.phone}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newStaff.password}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newStaff.role}
                onValueChange={(value) =>
                  setNewStaff({ ...newStaff, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THERAPIST">Therapist</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Permissions</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageUsers" className="font-normal">
                    Manage Users
                  </Label>
                  <Switch
                    id="canManageUsers"
                    checked={newStaff.canManageUsers}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canManageUsers: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageAppointments" className="font-normal">
                    Manage Appointments
                  </Label>
                  <Switch
                    id="canManageAppointments"
                    checked={newStaff.canManageAppointments}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canManageAppointments: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageArticles" className="font-normal">
                    Manage Articles
                  </Label>
                  <Switch
                    id="canManageArticles"
                    checked={newStaff.canManageArticles}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canManageArticles: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageSettings" className="font-normal">
                    Manage Settings
                  </Label>
                  <Switch
                    id="canManageSettings"
                    checked={newStaff.canManageSettings}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canManageSettings: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canViewAllPatients" className="font-normal">
                    View All Patients
                  </Label>
                  <Switch
                    id="canViewAllPatients"
                    checked={newStaff.canViewAllPatients}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canViewAllPatients: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canCreateClinicalNotes" className="font-normal">
                    Create Clinical Notes
                  </Label>
                  <Switch
                    id="canCreateClinicalNotes"
                    checked={newStaff.canCreateClinicalNotes}
                    onCheckedChange={(checked) =>
                      setNewStaff({ ...newStaff, canCreateClinicalNotes: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStaffModal(false)}>
              Cancel
            </Button>
            <Button onClick={createStaff} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Staff Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Configure what this staff member can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="p_isActive" className="font-normal">
                Account Active
              </Label>
              <Switch
                id="p_isActive"
                checked={permissions.isActive}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, isActive: checked })
                }
              />
            </div>
            <div className="border-t pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canManageUsers" className="font-normal">
                    Manage Users
                  </Label>
                  <Switch
                    id="p_canManageUsers"
                    checked={permissions.canManageUsers}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageUsers: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canManageAppointments" className="font-normal">
                    Manage Appointments
                  </Label>
                  <Switch
                    id="p_canManageAppointments"
                    checked={permissions.canManageAppointments}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageAppointments: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canManageArticles" className="font-normal">
                    Manage Articles
                  </Label>
                  <Switch
                    id="p_canManageArticles"
                    checked={permissions.canManageArticles}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageArticles: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canManageSettings" className="font-normal">
                    Manage Settings
                  </Label>
                  <Switch
                    id="p_canManageSettings"
                    checked={permissions.canManageSettings}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageSettings: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canViewAllPatients" className="font-normal">
                    View All Patients
                  </Label>
                  <Switch
                    id="p_canViewAllPatients"
                    checked={permissions.canViewAllPatients}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canViewAllPatients: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="p_canCreateClinicalNotes" className="font-normal">
                    Create Clinical Notes
                  </Label>
                  <Switch
                    id="p_canCreateClinicalNotes"
                    checked={permissions.canCreateClinicalNotes}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canCreateClinicalNotes: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              Cancel
            </Button>
            <Button onClick={updatePermissions} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </strong>
              ? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <strong>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </strong>{" "}
              ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-red-500">Password must be at least 6 characters</p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                The user will need to use this new password on their next login. Make sure to share it securely.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={resetPassword}
              disabled={isSubmitting || newPassword.length < 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Set New Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
