"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { useEmployees, useCreateEmployee, useDeleteEmployee } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { cn, getInitials, getDepartmentColor } from "@/lib/utils";

const departments = ["All", "Engineering", "Design", "Marketing", "Operations", "Management"];

const addSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(["admin", "employee"]),
});
type AddForm = z.infer<typeof addSchema>;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

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
    await createEmployee.mutateAsync(data);
    reset();
    setDialogOpen(false);
  };

  return (
    <RoleGuard allow={["admin"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees?.length ?? 0} team members
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0">
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input {...register("fullName")} className={errors.fullName ? "border-red-400" : ""} />
                  {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} className={errors.email ? "border-red-400" : ""} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" {...register("password")} className={errors.password ? "border-red-400" : ""} />
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input {...register("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select defaultValue="employee" onValueChange={(v) => setValue("role", v as "admin" | "employee")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input {...register("department")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Position</Label>
                    <Input {...register("position")} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); setDialogOpen(false); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700" disabled={createEmployee.isPending}>
                    {createEmployee.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add Employee"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or position..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
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

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-slate-100">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Contact</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Leave Balance</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((emp, i) => (
                <motion.tr
                  key={emp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
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
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", getDepartmentColor(emp.department))}>
                        {emp.department}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {emp.email}
                      </p>
                      {emp.phone && (
                        <p className="text-xs text-slate-400">{emp.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={cn(
                      "text-xs font-medium px-2.5 py-0.5 rounded-full capitalize",
                      emp.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {emp.role}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm font-medium text-slate-700">{emp.leaveBalance} days</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="rounded-lg">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/employees/${emp.id}`} className="cursor-pointer">
                            <Eye className="w-4 h-4" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && emp.id !== user?.id && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => {
                              if (confirm(`Delete ${emp.fullName}?`)) {
                                deleteEmployee.mutate(emp.id);
                              }
                            }}
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

          {employees?.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
    </RoleGuard>
  );
}
