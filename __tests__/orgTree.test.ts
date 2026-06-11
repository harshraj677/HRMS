import { describe, it, expect } from "vitest";
import {
  buildOrgForest, getOrgStats, getDistinctValues, getMatchIds, getVisibleIds,
  type FlatEmployee,
} from "@/lib/orgTree";

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
  position: "CEO", role: "admin", reportingManagerId: null,
  profile: { avatar: null, workLocation: "HQ" },
};
const manager1: FlatEmployee = {
  id: "manager1", fullName: "Manager One", email: "m1@x.com", department: "Engineering",
  position: "Manager", role: "manager", reportingManagerId: "ceo",
  profile: { avatar: null, workLocation: "HQ" },
};
const manager2: FlatEmployee = {
  id: "manager2", fullName: "Manager Two", email: "m2@x.com", department: "Sales",
  position: "Manager", role: "manager", reportingManagerId: "ceo",
  profile: { avatar: null, workLocation: "Remote" },
};
const emp1: FlatEmployee = {
  id: "emp1", fullName: "Employee One", email: "e1@x.com", department: "Engineering",
  position: "Engineer", role: "employee", reportingManagerId: "manager1",
  profile: { avatar: null, workLocation: "HQ" },
};
const emp2: FlatEmployee = {
  id: "emp2", fullName: "Employee Two", email: "e2@x.com", department: "Engineering",
  position: "Engineer", role: "employee", reportingManagerId: "manager1",
  profile: { avatar: null, workLocation: "Remote" },
};
const emp3: FlatEmployee = {
  id: "emp3", fullName: "Employee Three", email: "e3@x.com", department: "Sales",
  position: "Sales Rep", role: "employee", reportingManagerId: "manager2",
  profile: null,
};

const employees: FlatEmployee[] = [ceo, manager1, manager2, emp1, emp2, emp3];

// ── getOrgStats ──────────────────────────────────────────────────────────────

describe("getOrgStats", () => {
  it("computes totals, department count, manager count and max depth", () => {
    const stats = getOrgStats(employees);
    expect(stats.totalEmployees).toBe(6);
    expect(stats.totalDepartments).toBe(3); // Management, Engineering, Sales
    expect(stats.totalManagers).toBe(3); // ceo, manager1, manager2 are each referenced as a manager
    expect(stats.maxDepth).toBe(3); // ceo (1) -> manager (2) -> emp (3)
  });
});

// ── getDistinctValues ─────────────────────────────────────────────────────────

describe("getDistinctValues", () => {
  it("returns sorted, deduped, non-null department names", () => {
    const depts = getDistinctValues(employees, (e) => e.department);
    expect(depts).toEqual(["Engineering", "Management", "Sales"]);
  });

  it("excludes null/undefined values", () => {
    const locations = getDistinctValues(employees, (e) => e.profile?.workLocation);
    expect(locations).toEqual(["HQ", "Remote"]);
  });
});

// ── getMatchIds ────────────────────────────────────────────────────────────────

describe("getMatchIds", () => {
  it("matches by name search (case-insensitive)", () => {
    const ids = getMatchIds(employees, "manager one", {});
    expect(ids).toEqual(new Set(["manager1"]));
  });

  it("matches by department filter", () => {
    const ids = getMatchIds(employees, "", { department: "Engineering" });
    expect(ids).toEqual(new Set(["manager1", "emp1", "emp2"]));
  });

  it("combines search and filters with AND semantics", () => {
    const ids = getMatchIds(employees, "employee", { department: "Engineering" });
    expect(ids).toEqual(new Set(["emp1", "emp2"]));
  });

  it("returns an empty set when nothing matches", () => {
    const ids = getMatchIds(employees, "nonexistent", {});
    expect(ids.size).toBe(0);
  });
});

// ── getVisibleIds ────────────────────────────────────────────────────────────

describe("getVisibleIds", () => {
  it("includes a deep match plus its full ancestor chain", () => {
    const forest = buildOrgForest(employees);
    const matchIds = new Set(["emp1"]);
    const visible = getVisibleIds(forest, matchIds);
    expect(visible).toEqual(new Set(["emp1", "manager1", "ceo"]));
  });

  it("excludes unrelated branches", () => {
    const forest = buildOrgForest(employees);
    const matchIds = new Set(["emp1"]);
    const visible = getVisibleIds(forest, matchIds);
    expect(visible.has("manager2")).toBe(false);
    expect(visible.has("emp2")).toBe(false);
    expect(visible.has("emp3")).toBe(false);
  });
});
