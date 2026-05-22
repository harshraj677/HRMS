"use client";

import { useState, useEffect } from "react";
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
  Wifi,
  ShieldCheck,
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
import { useAuth, useChangePassword } from "@/hooks/useAuth";
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
  const changePassword = useChangePassword();

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

  const [officeSettings, setOfficeSettings] = useState({
    wifiName: "",
    officeIp: "",
    latitude: 13.962271577211828,
    longitude: 75.50897323054004,
    radiusMeters: 1000,
  });
  const [officeSaving, setOfficeSaving] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);

  useEffect(() => {
    if (authUser?.role !== "admin") return;
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data) setOfficeSettings(data);
      })
      .catch(() => {});
  }, [authUser?.role]);

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
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      toast.success("Password changed successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to change password");
    }
  };

  const saveNotifications = async () => {
    await new Promise(r => setTimeout(r, 500));
    toast.success("Notification preferences saved");
  };

  const saveOfficeSettings = async () => {
    setOfficeSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(officeSettings),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save office settings");
      } else {
        toast.success("Office settings saved");
      }
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setOfficeSaving(false);
    }
  };

  const detectOfficeIp = async () => {
    setDetectingIp(true);
    try {
      const res = await fetch("/api/settings/detect-ip");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to detect IP");
      } else {
        setOfficeSettings(prev => ({ ...prev, officeIp: json.ip }));
        toast.success(`Office IP detected: ${json.ip} — click Save to apply`);
      }
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setDetectingIp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account preferences</p>
      </div>

      <div>
        <Tabs defaultValue="profile">
          {/* Scrollable tab bar — gradient fade hints at more tabs on mobile */}
          <div className="relative">
            <div className="overflow-x-auto scrollbar-none">
              <TabsList className="bg-white border border-slate-100 shadow-sm inline-flex w-max rounded-xl p-1 gap-0.5">
                <TabsTrigger value="profile" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                  <User className="w-3.5 h-3.5 shrink-0" />Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                  <Bell className="w-3.5 h-3.5 shrink-0" />Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />Security
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                  <Palette className="w-3.5 h-3.5 shrink-0" />Appearance
                </TabsTrigger>
                {authUser?.role === "admin" && (
                  <TabsTrigger value="office" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                    <Wifi className="w-3.5 h-3.5 shrink-0" />Office Settings
                  </TabsTrigger>
                )}
                {authUser?.role === "admin" && (
                  <TabsTrigger value="organisation" className="gap-1.5 shrink-0 rounded-lg text-xs sm:text-sm px-3 py-2">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />Organisation
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            {/* Right-side fade gradient — indicates scroll on small screens */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-slate-50 to-transparent sm:hidden" />
          </div>

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
                      aria-label={`Toggle ${n.label}`}
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
                <Button type="button" onClick={saveNotifications} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
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
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl" disabled={changePassword.isPending}>
                    {changePassword.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Password"}
                  </Button>
                </div>
              </form>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 mb-3">Add an extra layer of security to your account.</p>
                <Button type="button" variant="outline" className="rounded-xl text-sm">Enable 2FA</Button>
              </div>
            </div>
          </TabsContent>

          {/* Office Settings Tab — admin only */}
          {authUser?.role === "admin" && (
            <TabsContent value="office">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Office Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set the office WiFi name and register its public IP so only employees on the office network can check in. Also configure the GPS geofence as a fallback boundary.
                  </p>
                </div>
                <Separator />
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <Label>Office WiFi Name</Label>
                    <Input
                      placeholder="e.g. Anvesana_Office"
                      value={officeSettings.wifiName}
                      onChange={e => setOfficeSettings(prev => ({ ...prev, wifiName: e.target.value }))}
                    />
                    <p className="text-xs text-slate-400">
                      Leave empty to disable WiFi enforcement. When set, employees must be on the registered network to check in.
                    </p>
                  </div>
                  {officeSettings.wifiName && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Office WiFi IP Address
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Click Detect while on office WiFi"
                          value={officeSettings.officeIp}
                          onChange={e => setOfficeSettings(prev => ({ ...prev, officeIp: e.target.value }))}
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={detectOfficeIp}
                          disabled={detectingIp}
                          className="shrink-0 rounded-xl"
                        >
                          {detectingIp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Detect"}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Connect to the office WiFi, then click <strong>Detect</strong> to register its public IP. Employees will be blocked if their network IP doesn&apos;t match.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Office Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={officeSettings.latitude}
                      onChange={e => setOfficeSettings(prev => ({ ...prev, latitude: parseFloat(e.target.value) || prev.latitude }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Office Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={officeSettings.longitude}
                      onChange={e => setOfficeSettings(prev => ({ ...prev, longitude: parseFloat(e.target.value) || prev.longitude }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Geofence Radius (meters)</Label>
                    <Input
                      type="number"
                      min={50}
                      value={officeSettings.radiusMeters}
                      onChange={e => setOfficeSettings(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) || prev.radiusMeters }))}
                    />
                    <p className="text-xs text-slate-400">
                      Employees must be within this distance from office to check in.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={saveOfficeSettings}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                      disabled={officeSaving}
                    >
                      {officeSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : "Save Office Settings"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

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
                    type="button"
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
                <select aria-label="Language" className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Sidebar</h3>
                <p className="text-xs text-slate-500 mb-3">Choose default sidebar state on load.</p>
                <select aria-label="Sidebar default state" className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
                  <option value="expanded">Expanded</option>
                  <option value="collapsed">Collapsed</option>
                </select>
              </div>
            </div>
          </TabsContent>

          {/* ── Organisation Tab ──────────────────────────────── */}
          {authUser?.role === "admin" && (
            <OrgSettingsTab />
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ── Org settings tab ──────────────────────────────────────────
function OrgSettingsTab() {
  const [saving, setSaving]   = useState(false);
  const [orgInfo, setOrgInfo] = useState({
    orgName:     "Anvesana Innovation & Entrepreneurial Forum",
    tagline:     "Empowering Startups & Teams",
    website:     "https://anvesana.org",
    email:       "hr@anvesana.org",
    phone:       "",
    address:     "Hubli, Karnataka, India",
    founded:     "2022",
  });

  const inp = "h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors";

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Organisation settings saved.");
    setSaving(false);
  }

  return (
    <TabsContent value="organisation">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Organisation Profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">Company branding and contact information</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Organisation Name", key: "orgName"  as const },
            { label: "Tagline",           key: "tagline"  as const },
            { label: "Website",           key: "website"  as const },
            { label: "HR Email",          key: "email"    as const },
            { label: "Phone",             key: "phone"    as const },
            { label: "Address",           key: "address"  as const },
            { label: "Founded Year",      key: "founded"  as const },
          ].map(({ label, key }) => (
            <div key={key} className={key === "orgName" || key === "address" ? "sm:col-span-2" : ""}>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">{label}</Label>
              <input className={inp} value={orgInfo[key]} onChange={(e) => setOrgInfo((o) => ({ ...o, [key]: e.target.value }))} aria-label={label} />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Platform Modules</h3>
          <p className="text-xs text-slate-400">All modules are active. Contact support to adjust your plan.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "HR Profiles","Attendance","Leave Management","Payroll","Recruitment",
              "Helpdesk","HR Documents","Exit Management","Org Chart","Analytics",
              "Events","Training","AI Assistant","Startup Incubation",
            ].map((mod) => (
              <div key={mod} className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-emerald-700 truncate">{mod}</span>
              </div>
            ))}
          </div>
        </div>

        <Button type="button" onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving…</> : "Save Organisation Settings"}
        </Button>
      </div>
    </TabsContent>
  );
}
