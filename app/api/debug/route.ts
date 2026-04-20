import { NextResponse } from "next/server";
import { Pool } from "pg";

const pass = "nagup3blF3qxp0vr";
const ref  = "dwzjmkphaluemoplsqyw";

const POOLER_REGIONS = [
  "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-northeast-2", "ap-east-1",
  "us-east-1", "us-west-1", "eu-west-1", "eu-central-1",
];

export async function GET() {
  // 1. Check if Supabase project is reachable via REST
  let restStatus = "unknown";
  try {
    const r = await fetch(`https://${ref}.supabase.co/rest/v1/`, { signal: AbortSignal.timeout(5000) });
    restStatus = `HTTP ${r.status}`;
  } catch (e: any) {
    restStatus = `FAIL: ${e.message}`;
  }

  // 2. Try each pooler region
  const poolerResults: Record<string, string> = {};
  for (const region of POOLER_REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const url = `postgresql://postgres.${ref}:${pass}@${host}:6543/postgres`;
    const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
    try {
      await pool.query("SELECT 1");
      poolerResults[region] = "✅ CONNECTED";
      await pool.end();
      break;
    } catch (e: any) {
      poolerResults[region] = e.message.slice(0, 60);
      await pool.end().catch(() => {});
    }
  }

  return NextResponse.json({ restStatus, poolerResults });
}
