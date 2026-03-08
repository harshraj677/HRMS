import mysql from "mysql2/promise";

// Singleton connection pool – reused across hot-reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  return mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export const db: mysql.Pool =
  globalThis._mysqlPool ?? (globalThis._mysqlPool = createPool());
