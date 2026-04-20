import { Pool, QueryResult } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });
}

export const pgPool: Pool = globalThis._pgPool ?? (globalThis._pgPool = createPool());

// PascalCase table names created with quoted identifiers in Supabase
const QUOTED_TABLES = [
  "Employee", "Attendance", "LeaveRequest", "LoginHistory",
  "SuspiciousLog", "Department", "Role",
];

// camelCase column names created with quoted identifiers in Supabase
const QUOTED_COLUMNS = [
  "fullName", "passwordHash", "mustChangePassword", "leaveBalance",
  "checkIn", "checkOut", "distanceFromOffice",
  "startDate", "endDate", "approvedBy",
  "loginTime", "employeeId", "ipAddress", "createdAt",
];

function normalizeQuery(query: string): string {
  let q = query;

  // Quote PascalCase table names
  for (const table of QUOTED_TABLES) {
    q = q.replace(new RegExp(`\\b${table}\\b`, "g"), `"${table}"`);
  }

  // Quote camelCase column names (skip if already quoted)
  for (const col of QUOTED_COLUMNS) {
    q = q.replace(new RegExp(`(?<!")\\b${col}\\b(?!")`, "g"), `"${col}"`);
  }

  // MySQL → PostgreSQL syntax
  q = q.replace(/success\s*=\s*false/g, "success = false"); // already converted – noop guard
  q = q.replace(/\bsuccess\s*=\s*0\b/g, "success = false");
  q = q.replace(/\bsuccess\s*=\s*1\b/g, "success = true");
  q = q.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+(MINUTE|DAY|MONTH|YEAR)\)/gi, "$1 - INTERVAL '$2 $3'");
  q = q.replace(/\bCURDATE\(\)/gi, "CURRENT_DATE");
  q = q.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");

  return q;
}

export const db = {
  execute: async <T = any>(query: string, params: any[] = []): Promise<[T, any]> => {
    let index = 1;
    let pgQuery = query.replace(/\?/g, () => `$${index++}`);
    pgQuery = normalizeQuery(pgQuery);
    const result: QueryResult = await pgPool.query(pgQuery, params);
    return [result.rows as any, result.fields];
  },
  query: async <T = any>(query: string, params: any[] = []): Promise<[T, any]> => {
    let index = 1;
    let pgQuery = query.replace(/\?/g, () => `$${index++}`);
    pgQuery = normalizeQuery(pgQuery);
    const result: QueryResult = await pgPool.query(pgQuery, params);
    return [result.rows as any, result.fields];
  },
};
