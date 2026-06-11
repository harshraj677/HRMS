import { describe, it, expect, vi } from "vitest";

// Mock the Prisma module — these tests only exercise the pure helper logic.
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: { findMany: vi.fn() },
  },
}));

import { buildOrgForest, getDescendantIds, getOrgScopedEmployeeIds, type FlatEmployee } from "@/lib/orgHierarchy";
import type { JWTPayload } from "@/lib/auth";

// ── Fixture: a small org chart ──────────────────────────────────────────────
//
//        ceo
//       /    \
//   manager1  manager2
//    /   \         \
//  emp1  emp2      emp3
//
const ceo: FlatEmployee = {
  id: "ceo", fullName: "CEO", email: "ceo@x.com", department: "Management",
  position: "CEO", role: "admin", reportingManagerId: null, profile: null,
};
const manager1: FlatEmployee = {
  id: "manager1", fullName: "Manager One", email: "m1@x.com", department: "Engineering",
  position: "Manager", role: "manager", reportingManagerId: "ceo", profile: null,
};
const manager2: FlatEmployee = {
  id: "manager2", fullName: "Manager Two", email: "m2@x.com", department: "Sales",
  position: "Manager", role: "manager", reportingManagerId: "ceo", profile: null,
};
const emp1: FlatEmployee = {
  id: "emp1", fullName: "Employee One", email: "e1@x.com", department: "Engineering",
  position: "Engineer", role: "employee", reportingManagerId: "manager1", profile: null,
};
const emp2: FlatEmployee = {
  id: "emp2", fullName: "Employee Two", email: "e2@x.com", department: "Engineering",
  position: "Engineer", role: "employee", reportingManagerId: "manager1", profile: null,
};
const emp3: FlatEmployee = {
  id: "emp3", fullName: "Employee Three", email: "e3@x.com", department: "Sales",
  position: "Sales Rep", role: "employee", reportingManagerId: "manager2", profile: null,
};

const employees: FlatEmployee[] = [ceo, manager1, manager2, emp1, emp2, emp3];

// ── buildOrgForest ───────────────────────────────────────────────────────────

describe("buildOrgForest", () => {
  it("places employees with no resolvable manager at the root", () => {
    const forest = buildOrgForest(employees);
    expect(forest).toHaveLength(1);
    expect(forest[0].id).toBe("ceo");
  });

  it("nests employees under their reporting manager", () => {
    const [root] = buildOrgForest(employees);
    const childIds = root.children.map((c) => c.id).sort();
    expect(childIds).toEqual(["manager1", "manager2"]);

    const m1 = root.children.find((c) => c.id === "manager1")!;
    expect(m1.children.map((c) => c.id).sort()).toEqual(["emp1", "emp2"]);

    const m2 = root.children.find((c) => c.id === "manager2")!;
    expect(m2.children.map((c) => c.id)).toEqual(["emp3"]);
  });

  it("leaves leaf nodes with empty children arrays", () => {
    const [root] = buildOrgForest(employees);
    const m1 = root.children.find((c) => c.id === "manager1")!;
    const e1 = m1.children.find((c) => c.id === "emp1")!;
    expect(e1.children).toEqual([]);
  });
});

// ── getDescendantIds ─────────────────────────────────────────────────────────

describe("getDescendantIds", () => {
  it("returns all transitive direct reports of the CEO", () => {
    const ids = getDescendantIds("ceo", employees).sort();
    expect(ids).toEqual(["emp1", "emp2", "emp3", "manager1", "manager2"].sort());
  });

  it("returns only the manager's direct reports when there are no further levels", () => {
    const ids = getDescendantIds("manager1", employees).sort();
    expect(ids).toEqual(["emp1", "emp2"]);
  });

  it("returns an empty array for a leaf employee", () => {
    expect(getDescendantIds("emp1", employees)).toEqual([]);
  });
});

// ── getOrgScopedEmployeeIds ───────────────────────────────────────────────────

describe("getOrgScopedEmployeeIds", () => {
  const asPayload = (id: string, role: string): JWTPayload => ({
    id, role, email: `${id}@x.com`, fullName: id,
  });

  it("returns every employee ID for admin", () => {
    const ids = getOrgScopedEmployeeIds(asPayload("ceo", "admin"), employees).sort();
    expect(ids).toEqual(employees.map((e) => e.id).sort());
  });

  it("returns every employee ID for hr", () => {
    const ids = getOrgScopedEmployeeIds(asPayload("someone", "hr"), employees).sort();
    expect(ids).toEqual(employees.map((e) => e.id).sort());
  });

  it("returns self plus full subtree for a manager", () => {
    const ids = getOrgScopedEmployeeIds(asPayload("manager1", "manager"), employees).sort();
    expect(ids).toEqual(["emp1", "emp2", "manager1"].sort());
  });

  it("returns only self for a plain employee", () => {
    const ids = getOrgScopedEmployeeIds(asPayload("emp1", "employee"), employees);
    expect(ids).toEqual(["emp1"]);
  });
});
