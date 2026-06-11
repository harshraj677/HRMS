import { prisma } from "@/lib/db";

export type { FlatEmployee, OrgNode } from "@/lib/orgTree";
export { buildOrgForest, getDescendantIds, getOrgScopedEmployeeIds } from "@/lib/orgTree";

import type { FlatEmployee } from "@/lib/orgTree";

const ACTIVE_FILTER = {
  status: "active",
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

/** Single query returning all active employees in flat form, for org-tree/hierarchy use. */
export async function getActiveEmployeesFlat(): Promise<FlatEmployee[]> {
  const employees = await prisma.employee.findMany({
    where: ACTIVE_FILTER,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      department: true,
      position: true,
      role: true,
      reportingManagerId: true,
      createdAt: true,
      profile: { select: { avatar: true, workLocation: true } },
    },
    orderBy: { fullName: "asc" },
  });
  return employees as unknown as FlatEmployee[];
}
