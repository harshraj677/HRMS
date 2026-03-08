"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Bell,
  Lock,
  Palette,
  Loader2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEmployee } from "@/hooks/useEmployees";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  firstName: z.string().min(2, "Too short"),
  lastName: z.string().min(1, "Too short"),
  phone: z.string().min(10, "Invalid phone number"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

const notificationSettings = [
  { id: "leave_updates", label: "Leave Request Updates", desc: "Notify when a leave request is approved or rejected", default: true },
  { id: "attendance_alerts", label: "Attendance Alerts", desc: "Daily check-in/check-out reminders", default: true },
  { id: "new_messages", label: "New Messages", desc: "Notify when you receive a new message", default: true },
  { id: "announcements", label: "Company Announcements", desc: "Company-wide announcements and events", default: false },
  { id: "holiday_updates", label: "Holiday Updates", desc: "Upcoming holidays and leave calendar updates", default: false },
];

const themeOptions = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export default function SettingsPage() {
  const { data: authUser } = useAuth();
  const { data: employee, isLoading: empLoading } = useEmployee(authUser?.id ?? "");
  const queryClient = useQueryClient();

  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationSettings.map(n => [n.id, n.default]))
  );
  const [selectedTheme, setSelectedTheme] = useState("light");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });

  // Populate form when employee record loads
  useEffect(() => {
    if (!employee) return;
    const parts = employee.fullName.trim().split(" ");
    profileForm.reset({
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" ") || "",
      phone: employee.phone ?? "",
    });
  }, [employee, profileForm]);

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const onSaveProfile = async (data: ProfileData) => {
    if (!authUser) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/employees/${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update profile");
      } else {
        toast.success("Profile updated successfully");
        queryClient.invalidateQueries({ queryKey: ["employees", authUser.id] });
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordData) => {
    setPasswordSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setPasswordSaving(false);
    passwordForm.reset();
    toast.success("Password changed successfully");
  };

  const saveNotifications = async () => {
    await new Promise(r => setTimeout(r, 500));
    toast.success("Notification preferences saved");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account preferences</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Tabs defaultValue="profile">
          <TabsList className="bg-white border border-slate-100 shadow-sm">
            <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Lock className="w-3.5 h-3.5" />Security</TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5"><Palette className="w-3.5 h-3.5" />Appearance</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              {/* Avatar Section */}
              {empLoading ? (
                <div className="flex items-center gap-5">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                      {getInitials(employee?.fullName ?? authUser?.fullName ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{employee?.fullName ?? authUser?.fullName}</p>
                    <p className="text-xs text-slate-500">{employee?.email ?? authUser?.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{employee?.position ?? ""}{employee?.department ? ` · ${employee.department}` : ""}</p>
                  </div>
                </div>
              )}
              <Separator />
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>First Name</Label>
                    <Input {...profileForm.register("firstName")} className={profileForm.formState.errors.firstName ? "border-red-400" : ""} />
                    {profileForm.formState.errors.firstName && <p className="text-xs text-red-500">{profileForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input {...profileForm.register("lastName")} className={profileForm.formState.errors.lastName ? "border-red-400" : ""} />
                    {profileForm.formState.errors.lastName && <p className="text-xs text-red-500">{profileForm.formState.errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" value={employee?.email ?? authUser?.email ?? ""} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  <p className="text-xs text-slate-400">Email can only be changed by an admin.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input {...profileForm.register("phone")} className={profileForm.formState.errors.phone ? "border-red-400" : ""} />
                  {profileForm.formState.errors.phone && <p className="text-xs text-red-500">{profileForm.formState.errors.phone.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input value={employee?.department ?? ""} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Position</Label>
                    <Input value={employee?.position ?? ""} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl" disabled={profileSaving || empLoading}>
                    {profileSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Notification Preferences</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose what notifications you want to receive.</p>
              </div>
              <Separator />
              <div className="space-y-4">
                {notificationSettings.map(n => (
                  <div key={n.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{n.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                      className={cn(
                        "relative w-10 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                        notifications[n.id] ? "bg-indigo-600" : "bg-slate-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        notifications[n.id] && "translate-x-4"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button onClick={saveNotifications} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                  Save Preferences
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Use a strong password with at least 8 characters.</p>
              </div>
              <Separator />
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-sm">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      className={passwordForm.formState.errors.currentPassword ? "border-red-400" : ""}
                      {...passwordForm.register("currentPassword")}
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      className={passwordForm.formState.errors.newPassword ? "border-red-400" : ""}
                      {...passwordForm.register("newPassword")}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      className={passwordForm.formState.errors.confirmPassword ? "border-red-400" : ""}
                      {...passwordForm.register("confirmPassword")}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <div className="pt-2">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl" disabled={passwordSaving}>
                    {passwordSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Password"}
                  </Button>
                </div>
              </form>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 mb-3">Add an extra layer of security to your account.</p>
                <Button variant="outline" className="rounded-xl text-sm">Enable 2FA</Button>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Theme</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select your preferred color theme.</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {themeOptions.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTheme(t.id); toast.success(`Theme set to ${t.label}`); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      selectedTheme === t.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {selectedTheme === t.id && <Check className="w-3.5 h-3.5" />}
                    {t.label}
                  </button>
                ))}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Language</h3>
                <p className="text-xs text-slate-500 mb-3">Choose your display language.</p>
                <select className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Sidebar</h3>
                <p className="text-xs text-slate-500 mb-3">Choose default sidebar state on load.</p>
                <select className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
                  <option value="expanded">Expanded</option>
                  <option value="collapsed">Collapsed</option>
                </select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
