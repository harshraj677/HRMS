import { NextResponse } from "next/server";
import { Pool } from "pg";

const TEST_URLS = [
  process.env.DATABASE_URL,
  `postgresql://postgres.dwzjmkphaluemoplsqyw:nagup3blF3qxp0vr@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.dwzjmkphaluemoplsqyw:nagup3blF3qxp0vr@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.dwzjmkphaluemoplsqyw:nagup3blF3qxp0vr@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
];

export async function GET() {
  const results: Record<string, string> = {};

  for (const url of TEST_URLS) {
    if (!url) continue;
    const label = url.split("@")[1]?.split("/")[0] ?? url;
    const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    try {
      const r = await pool.query('SELECT COUNT(*) as c FROM "Employee"');
      results[label] = `OK — ${r.rows[0].c} employees`;
      await pool.end();
      break;
    } catch (e: any) {
      results[label] = `FAIL: ${e.message}`;
      await pool.end().catch(() => {});
    }
  }

  return NextResponse.json(results);
}
