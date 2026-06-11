import { describe, it, expect } from "vitest";
import { getApprovalStatus, derivePlaceholderName, getApprovalStatusBadge } from "@/lib/onboarding";

describe("getApprovalStatus", () => {
  it("returns the given status when it is a valid approval status", () => {
    expect(getApprovalStatus("INVITED")).toBe("INVITED");
    expect(getApprovalStatus("PROFILE_SUBMITTED")).toBe("PROFILE_SUBMITTED");
  });

  it("falls back to ACTIVE for null, undefined, or unknown values", () => {
    expect(getApprovalStatus(null)).toBe("ACTIVE");
    expect(getApprovalStatus(undefined)).toBe("ACTIVE");
    expect(getApprovalStatus("not_a_real_status")).toBe("ACTIVE");
    expect(getApprovalStatus("")).toBe("ACTIVE");
  });
});

describe("derivePlaceholderName", () => {
  it("title-cases dot-separated local parts", () => {
    expect(derivePlaceholderName("john.doe@example.com")).toBe("John Doe");
  });

  it("handles underscores and hyphens", () => {
    expect(derivePlaceholderName("jane_smith@example.com")).toBe("Jane Smith");
    expect(derivePlaceholderName("mary-anne@example.com")).toBe("Mary Anne");
  });

  it("handles a single-word local part", () => {
    expect(derivePlaceholderName("admin@example.com")).toBe("Admin");
  });

  it("strips numbers and non-alphanumeric noise from segments", () => {
    expect(derivePlaceholderName("john.doe123@example.com")).toBe("John Doe123");
  });

  it("falls back to a default when the local part yields nothing usable", () => {
    expect(derivePlaceholderName("...@example.com")).toBe("New Employee");
  });
});

describe("getApprovalStatusBadge", () => {
  it("returns a label and className for each known status", () => {
    expect(getApprovalStatusBadge("INVITED")).toEqual({ label: "Invited", className: "bg-sky-100 text-sky-700" });
    expect(getApprovalStatusBadge("PROFILE_SUBMITTED").label).toBe("Pending Review");
    expect(getApprovalStatusBadge("ACTIVE").label).toBe("Active");
  });

  it("treats missing/unknown status as ACTIVE", () => {
    expect(getApprovalStatusBadge(null)).toEqual({ label: "Active", className: "bg-emerald-100 text-emerald-700" });
    expect(getApprovalStatusBadge("garbage").label).toBe("Active");
  });
});
