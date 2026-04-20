require('dotenv').config();
const { Client } = require('pg');

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('Connecting to Supabase PostgreSQL...');
        await client.connect();

        console.log('Creating tables...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS "Employee" (
                "id" SERIAL PRIMARY KEY,
                "fullName" TEXT NOT NULL,
                "email" TEXT NOT NULL UNIQUE,
                "phone" TEXT,
                "department" TEXT,
                "position" TEXT,
                "role" TEXT NOT NULL DEFAULT 'employee',
                "passwordHash" TEXT NOT NULL,
                "leaveBalance" INTEGER NOT NULL DEFAULT 18,
                "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
                "status" TEXT NOT NULL DEFAULT 'active',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "Attendance" (
                "id" SERIAL PRIMARY KEY,
                "employeeId" INTEGER NOT NULL,
                "date" DATE NOT NULL,
                "checkIn" TIMESTAMP(3),
                "checkOut" TIMESTAMP(3),
                "hours" DOUBLE PRECISION,
                "status" TEXT NOT NULL DEFAULT 'present',
                "latitude" DOUBLE PRECISION,
                "longitude" DOUBLE PRECISION,
                "ipAddress" TEXT,
                "device" TEXT,
                "distanceFromOffice" DOUBLE PRECISION,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "Attendance_employeeId_date_key" UNIQUE ("employeeId", "date")
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "LeaveRequest" (
                "id" SERIAL PRIMARY KEY,
                "employeeId" INTEGER NOT NULL,
                "startDate" DATE NOT NULL,
                "endDate" DATE NOT NULL,
                "days" INTEGER NOT NULL DEFAULT 1,
                "reason" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "approvedBy" INTEGER,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "LoginHistory" (
                "id" SERIAL PRIMARY KEY,
                "employeeId" INTEGER NOT NULL,
                "ipAddress" TEXT,
                "device" TEXT,
                "browser" TEXT,
                "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "success" BOOLEAN NOT NULL DEFAULT true,
                CONSTRAINT "LoginHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "SuspiciousLog" (
                "id" SERIAL PRIMARY KEY,
                "employeeId" INTEGER NOT NULL,
                "type" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "ipAddress" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "SuspiciousLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "Department" (
                "id" SERIAL PRIMARY KEY,
                "name" TEXT NOT NULL
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS "Role" (
                "id" SERIAL PRIMARY KEY,
                "name" TEXT NOT NULL
            );
        `);

        console.log('Tables created successfully!');
    } catch(err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
};

run();