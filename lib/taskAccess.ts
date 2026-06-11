import { prisma } from "@/lib/db";
import { JWTPayload } from "@/lib/auth";

const ACTIVE_FILTER = {
  status: "active",
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export interface AssignableEmployee {
  id: string;
  fullName: string;
  department: string | null;
  position: string | null;
  role: string;
}

/**
 * Returns the employees the current user is allowed to assign tasks to.
 * Admin → everyone. Anyone else → themselves, their direct reports
 * (reportingManagerId match), and employees in their own department.
 */
export async function getAssignableEmployees(payload: JWTPayload): Promise<AssignableEmployee[]> {
  if (payload.role === "admin") {
    return prisma.employee.findMany({
      where: ACTIVE_FILTER,
      select: { id: true, fullName: true, department: true, position: true, role: true },
      orderBy: { fullName: "asc" },
    });
  }

  return prisma.employee.findMany({
    where: {
      AND: [
        ACTIVE_FILTER,
        {
          OR: [
            { id: payload.id },
            { reportingManagerId: payload.id },
            { department: payload.department ?? "__none__" },
          ],
        },
      ],
    },
    select: { id: true, fullName: true, department: true, position: true, role: true },
    orderBy: { fullName: "asc" },
  });
}

/** Whether `payload` is allowed to assign a task to `targetEmployeeId`. */
export async function canAssignTask(payload: JWTPayload, targetEmployeeId: string): Promise<boolean> {
  if (payload.role === "admin") return true;
  if (targetEmployeeId === payload.id) return true;

  const target = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { reportingManagerId: true, department: true },
  });
  if (!target) return false;
  if (target.reportingManagerId === payload.id) return true;
  if (payload.department && target.department === payload.department) return true;
  return false;
}
