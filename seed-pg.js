require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const users = [
  {
    fullName: 'Harish Raj',
    email: 'harish@anvesana.com',
    password: 'anvesana@2026',
    role: 'admin',
    department: 'Management',
    position: 'Admin',
    phone: '+91 98765 00001',
    leaveBalance: 18,
  },
  {
    fullName: 'Pavan Kumar',
    email: 'pavan@anvesana.com',
    password: 'anvesana@2026',
    role: 'employee',
    department: 'Programs',
    position: 'Program Associate',
    phone: '+91 98765 00002',
    leaveBalance: 18,
  },
  {
    fullName: 'Vishwa Reddy',
    email: 'vishwa@anvesana.com',
    password: 'anvesana@2026',
    role: 'employee',
    department: 'Design',
    position: 'Graphic Designer',
    phone: '+91 98765 00003',
    leaveBalance: 18,
  },
  {
    fullName: 'Bharath Naidu',
    email: 'bharath@anvesana.com',
    password: 'anvesana@2026',
    role: 'employee',
    department: 'Incubation',
    position: 'Incubation Manager',
    phone: '+91 98765 00004',
    leaveBalance: 18,
  },
  {
    fullName: 'Sarvesh Sharma',
    email: 'sarvesh@anvesana.com',
    password: 'anvesana@2026',
    role: 'employee',
    department: 'Content',
    position: 'Content Manager',
    phone: '+91 98765 00005',
    leaveBalance: 18,
  },
];

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase.\n');

    // Clear all related tables first (respect FK order)
    await client.query('DELETE FROM "SuspiciousLog"');
    await client.query('DELETE FROM "LoginHistory"');
    await client.query('DELETE FROM "Attendance"');
    await client.query('DELETE FROM "LeaveRequest"');
    await client.query('DELETE FROM "Employee"');
    console.log('Cleared old data.\n');

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO "Employee" ("fullName","email","passwordHash","role","department","position","phone","leaveBalance")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [user.fullName, user.email, hash, user.role, user.department, user.position, user.phone, user.leaveBalance]
      );
      console.log(`✓ ${user.role === 'admin' ? 'ADMIN   ' : 'EMPLOYEE'} | ${user.fullName.padEnd(18)} | ${user.email}`);
    }

    console.log('\n✅ All users seeded!\n');
    console.log('Password for all accounts: anvesana@2026');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
};

run();
