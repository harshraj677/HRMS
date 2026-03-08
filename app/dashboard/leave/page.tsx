"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Calendar,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaveRequests, useSubmitLeaveRequest, useApproveLeave, useRejectLeave } from "@/hooks/useLeave";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, getStatusColor, getInitials } from "@/lib/utils";

const leaveSchema = z.object({
  startDate: z.string().min(1, "Please select a start date"),
  endDate: z.string().min(1, "Please select an end date"),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(300),
});

type LeaveFormData = z.infer<typeof leaveSchema>;

export default function LeavePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: leaveRequests, isLoading } = useLeaveRequests();
  const submitLeave = useSubmitLeaveRequest();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveFormData>({ resolver: zodResolver(leaveSchema) });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
  };

  const onSubmit = async (data: LeaveFormData) => {
    await submitLeave.mutateAsync(data);
    reset();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin ? "Manage team leave requests" : "Manage your time-off requests (max 18 days/year)"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0">
              <Plus className="w-4 h-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    className={errors.startDate ? "border-red-400" : ""}
                    {...register("startDate")}
                  />
                  {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    className={errors.endDate ? "border-red-400" : ""}
                    {...register("endDate")}
                  />
                  {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
                </div>
              </div>

              {/* Days Preview */}
              {calculateDays() > 0 && (
                <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span><strong>{calculateDays()} day{calculateDays() > 1 ? "s" : ""}</strong> of leave requested</span>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Briefly describe the reason for your leave..."
                  className={cn("min-h-[90px] resize-none", errors.reason ? "border-red-400" : "")}
                  {...register("reason")}
                />
                {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => { reset(); setDialogOpen(false); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  disabled={submitLeave.isPending}
                >
                  {submitLeave.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave History Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="all">
          <TabsList className="bg-white border border-slate-100 shadow-sm">
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {leaveRequests?.filter((l: any) => l.status === "pending").length ? (
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full font-medium">
                  {leaveRequests.filter((l: any) => l.status === "pending").length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-1 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      {isAdmin && <TableHead className="text-xs font-semibold text-slate-500 uppercase">Employee</TableHead>}
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Duration</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Reason</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Applied On</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                      {isAdmin && tab === "pending" && <TableHead className="text-xs font-semibold text-slate-500 uppercase">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests
                      ?.filter((l: any) => tab === "all" || l.status === tab)
                      .map((leave: any, i: number) => (
                        <motion.tr
                          key={leave.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-slate-100 hover:bg-slate-50/50"
                        >
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.fullName}`} />
                                  <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                    {getInitials(leave.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{leave.fullName}</p>
                                  <p className="text-xs text-slate-400">{leave.department ?? ""}</p>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-sm">
                            <p className="text-slate-700 font-medium">{formatDate(leave.startDate)}</p>
                            {leave.startDate !== leave.endDate && (
                              <p className="text-xs text-slate-400">to {formatDate(leave.endDate)}</p>
                            )}
                            <p className="text-xs text-indigo-600">{leave.days} day{leave.days > 1 ? "s" : ""}</p>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                            {leave.reason}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 hidden sm:table-cell">
                            {formatDate(leave.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-xs font-medium px-2.5 py-0.5 rounded-full capitalize block w-fit",
                              getStatusColor(leave.status)
                            )}>
                              {leave.status}
                            </span>
                          </TableCell>
                          {isAdmin && tab === "pending" && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={approveLeave.isPending}
                                  onClick={() => approveLeave.mutate(leave.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={rejectLeave.isPending}
                                  onClick={() => rejectLeave.mutate(leave.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      ))}
                    {leaveRequests?.filter((l: any) => tab === "all" || l.status === tab).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-slate-400">
                          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">No {tab === "all" ? "" : tab} leave requests found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
}
