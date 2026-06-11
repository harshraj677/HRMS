import { JWTPayload } from "@/lib/auth";
import { canManageOrgStructure } from "@/lib/roles";

export interface FlatEmployee {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  position: string | null;
  role: string;
  reportingManagerId: string | null;
  profile: { avatar: string | null; workLocation: string | null } | null;
  phone?: string | null;
  createdAt?: string;
}

export interface OrgNode extends FlatEmployee {
  children: OrgNode[];
}

/** Builds a tree/forest from a flat employee list, keyed by reportingManagerId. Roots have no resolvable manager. */
export function buildOrgForest(employees: FlatEmployee[]): OrgNode[] {
  const byId = new Map<string, OrgNode>();
  for (const emp of employees) {
    byId.set(emp.id, { ...emp, children: [] });
  }

  const roots: OrgNode[] = [];
  for (const node of byId.values()) {
    const managerId = node.reportingManagerId;
    const manager = managerId ? byId.get(managerId) : undefined;
    if (manager) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** BFS over the flat list, returning the IDs of all transitive direct reports of `employeeId`. */
export function getDescendantIds(employeeId: string, employees: FlatEmployee[]): string[] {
  const childrenByManager = new Map<string, string[]>();
  for (const emp of employees) {
    if (!emp.reportingManagerId) continue;
    const list = childrenByManager.get(emp.reportingManagerId);
    if (list) list.push(emp.id);
    else childrenByManager.set(emp.reportingManagerId, [emp.id]);
  }

  const result: string[] = [];
  const queue = [...(childrenByManager.get(employeeId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    const children = childrenByManager.get(id);
    if (children) queue.push(...children);
  }

  return result;
}

/** Returns the set of employee IDs `payload` is allowed to view/manage in org-hierarchy terms. */
export function getOrgScopedEmployeeIds(payload: JWTPayload, employees: FlatEmployee[]): string[] {
  if (canManageOrgStructure(payload.role)) {
    return employees.map((e) => e.id);
  }
  if (payload.role === "manager") {
    return [payload.id, ...getDescendantIds(payload.id, employees)];
  }
  return [payload.id];
}

/** Aggregate stats for the org-structure summary cards. */
export function getOrgStats(employees: FlatEmployee[]): {
  totalEmployees: number;
  totalDepartments: number;
  totalManagers: number;
  maxDepth: number;
} {
  const departments = new Set<string>();
  const managerIds = new Set<string>();
  for (const emp of employees) {
    if (emp.department) departments.add(emp.department);
    if (emp.reportingManagerId) managerIds.add(emp.reportingManagerId);
  }

  const forest = buildOrgForest(employees);
  let maxDepth = 0;
  const visit = (node: OrgNode, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children) visit(child, depth + 1);
  };
  for (const root of forest) visit(root, 1);

  return {
    totalEmployees: employees.length,
    totalDepartments: departments.size,
    totalManagers: managerIds.size,
    maxDepth,
  };
}

/** Sorted, deduped, non-null/non-empty values picked from each employee — used for filter dropdowns. */
export function getDistinctValues(
  employees: FlatEmployee[],
  picker: (employee: FlatEmployee) => string | null | undefined
): string[] {
  const values = new Set<string>();
  for (const emp of employees) {
    const value = picker(emp);
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

/** IDs of employees matching the search text (name/email/position/department) AND all active filters. */
export function getMatchIds(
  employees: FlatEmployee[],
  query: string,
  filters: { department?: string; position?: string; location?: string }
): Set<string> {
  const q = query.trim().toLowerCase();
  const matches = new Set<string>();

  for (const emp of employees) {
    if (filters.department && emp.department !== filters.department) continue;
    if (filters.position && emp.position !== filters.position) continue;
    if (filters.location && emp.profile?.workLocation !== filters.location) continue;

    if (q) {
      const haystack = [emp.fullName, emp.email, emp.position, emp.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    matches.add(emp.id);
  }

  return matches;
}

/** Match IDs plus all of their ancestor IDs, so ancestor chains stay visible when filtering. */
export function getVisibleIds(forest: OrgNode[], matchIds: Set<string>): Set<string> {
  const visible = new Set<string>();

  const visit = (node: OrgNode, ancestors: string[]): boolean => {
    let hasMatch = matchIds.has(node.id);
    for (const child of node.children) {
      if (visit(child, [...ancestors, node.id])) hasMatch = true;
    }
    if (hasMatch) {
      visible.add(node.id);
      for (const ancestorId of ancestors) visible.add(ancestorId);
    }
    return hasMatch;
  };

  for (const root of forest) visit(root, []);

  return visible;
}
