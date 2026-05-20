"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Eye,
  Trash2,
  Users,
  Loader2,
  Phone,
  Briefcase,
  Copy,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployees, useCreateEmployee, useDeleteEmployee, EmployeeData } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { cn, getInitials, getDepartmentColor } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { motion } from "framer-motion";

const departments = ["All", "Management", "Programs", "Design", "Incubation", "Content", "Engineering", "Marketing", "Operations"];

const addSchema = z.object({
  fullName:   z.string().min(2, "Name is required"),
  email:      z.string().email("Valid email required"),
  phone:      z.string().optional(),
  department: z.string().optional(),
  position:   z.string().optional(),
  role:       z.enum(["admin", "employee"]),
});
type AddForm = z.infer<typeof addSchema>;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"form" | "credentials">("form");
  const [credentials, setCredentials] = useState<{ email: string; password: string; emailSent: boolean } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeData | null>(null);

  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: employees, isLoading } = useEmployees({
    search: search || undefined,
    department: department !== "all" ? department : undefined,
  });
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { role: "employee" },
  });

  const onSubmit = async (data: AddForm) => {
    const result = await createEmployee.mutateAsync(data);
    reset();
    setCredentials({
      email: data.email.trim().toLowerCase(),
      password: result.generatedPassword,
      emailSent: result.emailSent ?? false,
    });
    setStep("credentials");
  };

  const handleCopy = (field: "email" | "password", value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDone = () => {
    setStep("form");
    setCredentials(null);
    setCopiedField(null);
    setDialogOpen(false);
  };

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {employees?.length ?? 0} team members
            </p>
          </div>

          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open) { setStep("form"); setCredentials(null); setCopiedField(null); }
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-sm shadow-indigo-500/25 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {step === "credentials" ? "Credentials Ready" : "Add New Employee"}
                  </DialogTitle>
                  {step === "form" && (
                    <p className="text-sm text-slate-400 mt-1">A temporary password will be emailed to them.</p>
                  )}
                </DialogHeader>

                {step === "credentials" && credentials ? (
                  <div className="space-y-5 mt-2">
                    <div className="flex flex-col items-center gap-2 py-1 text-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${credentials.emailSent ? "bg-emerald-100" : "bg-amber-100"}`}>
                        <CheckCheck className={`w-6 h-6 ${credentials.emailSent ? "text-emerald-600" : "text-amber-600"}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Employee account created.</p>
                      {credentials.emailSent ? (
                        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                          ✓ Credentials emailed to {credentials.email}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          ⚠ Email failed — copy and share these manually.
                        </p>
                      )}
                    </div>

                    {(["email", "password"] as const).map((field) => (
                      <div key={field} className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {field === "email" ? "Email" : "Temporary Password"}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-800 flex items-center overflow-x-auto whitespace-nowrap">
                            {credentials[field]}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(field, credentials[field])}
                            title={`Copy ${field}`}
                            className="h-11 w-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all shrink-0"
                          >
                            {copiedField === field
                              ? <CheckCheck className="w-4 h-4 text-emerald-500" />
                              : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleDone}
                      className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      Done — I&apos;ve saved the credentials
                    </button>
                  </div>
                ) : (

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</Label>
                      <Input
                        {...register("fullName")}
                        placeholder="e.g. Arjun Sharma"
                        className={cn(
                          "h-11 rounded-xl bg-slate-50 border-slate-200",
                          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
                          errors.fullName && "border-red-400 bg-red-50/60"
                        )}
                      />
                      {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
                      <Input
                        type="email"
                        {...register("email")}
                        placeholder="arjun@anvesana.org"
                        className={cn(
                          "h-11 rounded-xl bg-slate-50 border-slate-200",
                          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
                          errors.email && "border-red-400 bg-red-50/60"
                        )}
                      />
                      {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</Label>
                      <Input
                        {...register("phone")}
                        placeholder="+91 99999 00000"
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</Label>
                      <Select
                        defaultValue="employee"
                        onValueChange={(v) => setValue("role", v as "admin" | "employee")}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</Label>
                      <Input
                        {...register("department")}
                        placeholder="Engineering"
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Position</Label>
                      <Input
                        {...register("position")}
                        placeholder="Developer"
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                      onClick={() => { reset(); setDialogOpen(false); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createEmployee.isPending}
                      className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm shadow-indigo-500/20"
                    >
                      {createEmployee.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                      ) : (
                        "Add Employee"
                      )}
                    </button>
                  </div>
                </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* ── Search & filter bar ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email or position…"
                className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full sm:w-48 h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : employees?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No employees found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* ── Mobile card grid (hidden md+) ──────────────────────── */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {employees?.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} />
                      <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700 font-bold">
                        {getInitials(emp.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{emp.fullName}</p>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
                          emp.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {emp.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{emp.position ?? "—"}</p>

                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {emp.department && (
                          <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full", getDepartmentColor(emp.department))}>
                            {emp.department}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          {emp.leaveBalance}d leave
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />{emp.email}
                        </span>
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" />{emp.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Employee actions"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/employees/${emp.id}`} className="cursor-pointer">
                            <Eye className="w-4 h-4" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && String(emp.id) !== String(user?.id) && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => setDeleteTarget(emp)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Desktop table (hidden below md) ───────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employee</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Department</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Role</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Leave</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((emp, i) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} />
                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
                              {getInitials(emp.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{emp.fullName}</p>
                            <p className="text-xs text-slate-400">{emp.position ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {emp.department ? (
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getDepartmentColor(emp.department))}>
                            {emp.department}
                          </span>
                        ) : "—"}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0 text-slate-400" /> {emp.email}
                          </p>
                          {emp.phone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 shrink-0" /> {emp.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize",
                          emp.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {emp.role}
                        </span>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm font-semibold text-emerald-700">{emp.leaveBalance}d</span>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Employee actions"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employees/${emp.id}`} className="cursor-pointer">
                                <Eye className="w-4 h-4" /> View Profile
                              </Link>
                            </DropdownMenuItem>
                            {isAdmin && String(emp.id) !== String(user?.id) && (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => setDeleteTarget(emp)}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          config={{
            resourceType: "Employee",
            displayName: deleteTarget.fullName,
            resourceSummary: deleteTarget.email,
            allowPermanentPurge: user?.role === "super_admin",
          }}
          isPending={deleteEmployee.isPending}
          onConfirm={async (opts) => {
            await deleteEmployee.mutateAsync({
              id: deleteTarget.id,
              confirmName: deleteTarget.fullName,
              ...opts,
            });
            setDeleteTarget(null);
          }}
        />
      )}
    </RoleGuard>
  );
}
