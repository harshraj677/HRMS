<img src="public/logo.jpg" alt="Anvesync HRMS" width="64" height="64" style="border-radius:12px" />

# Anvesync HRMS

> Enterprise-grade Human Resource Management System built for **Anvesana Innovation & Entrepreneurial Forum**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

A full-stack, mobile-first workforce management platform built with Next.js 15 App Router, TypeScript, MongoDB, and Tailwind CSS. Designed for managing employees, attendance, leave, payroll, startups, and internal operations — with enterprise-grade security, geotagged attendance, and a polished SaaS-quality UI.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Admin Configuration](#admin-configuration)
- [Database Schema](#database-schema)
- [Security](#security)
- [API Reference](#api-reference)
- [Scripts](#scripts)

---

## Features

### 🔐 Authentication & Security
- JWT-based authentication with `HttpOnly` cookies
- bcrypt password hashing (12 salt rounds)
- First-login `mustChangePassword` enforcement
- Full login history audit trail per employee
- Suspicious activity detection and logging
- Role-based access control — `admin` / `employee`

### 👥 Employee Management
- Full CRUD — add, view, edit, soft-delete employees
- Auto-generated secure temporary passwords on account creation
- Automated welcome email with credentials via SMTP (Nodemailer)
- Employee directory with search and department filters
- Profile completeness tracking and onboarding wizard
- Document upload and verification (certificates, degrees, resumes)
- Salary structure management per employee

### 📍 Geotagged Attendance
- One-click **Check In / Check Out** from dashboard and attendance page
- **GPS Geofencing** — blocks check-in beyond configured radius from office
- **Geotagged Selfie Watermark** — canvas-stamped photo with employee name, timestamp, GPS coordinates, and reverse-geocoded address (like a geotag camera app)
- **Reverse Geocoding** — live address automatically saved from latitude/longitude using OpenStreetMap Nominatim
- **Office WiFi Verification** — check-in blocked if not on registered office network
- **Fake GPS detection** — mock location apps are detected and logged
- **Liveness detection** — blink challenge to prevent photo spoofing
- **Face verification** — selfie compared against profile photo using face-api.js
- Attendance policy engine with geofence enforcement modes (soft / hard / allow-if-matched)
- Manual override workflow with HR review queue
- Attendance audit trail with full change history

### 🗺️ Admin Location Dashboard
- Live **Attendance Map** showing employee check-in locations (Google Maps)
- **Today's Check-ins panel** — geotagged selfie cards per employee with:
  - Reverse-geocoded address (e.g. "Connaught Place, New Delhi")
  - GPS coordinates
  - Check-in and check-out times
  - Lazy-loaded photo lightbox
  - Direct **View on Google Maps** link
- Filter by department and status

### 🏖️ Leave Management
- Employees submit leave with date range, category (casual / sick / earned / unpaid), and reason
- Admin approves or rejects with one click
- Leave balance auto-deducted on approval
- Leave history with status tracking

### 💰 Payroll
- Monthly payroll generation per employee
- Salary structure — earnings (basic, HRA, special allowance, bonus) + deductions (PF, tax, other)
- Banking info (account number, IFSC, PAN, UAN) stored per employee
- Admin payroll dashboard with payment status tracking
- Employee payslip view

### 📋 Recruitment
- Job posting management (title, department, skills, salary range, deadline)
- Candidate pipeline — stage tracking (Applied → Screening → Interview → HR Round → Selected / Rejected)

### 🎫 Helpdesk / Ticketing
- Employees raise support tickets with category and priority
- Admin assigns and resolves tickets with internal messaging thread

### 🚀 Startup Incubation
- Full CRUD for incubated startups (Diksuchi program)
- Track stage, funding status, mentor, team size, progress percentage
- Milestone tracking per startup
- Events management (workshops, hackathons, demo days)
- Mentor review scoring system

### 📊 Analytics & Dashboard
- **Admin dashboard** — 8 KPI cards: employees, attendance, leave, payroll, open jobs, tickets, startups
- **Employee dashboard** — attendance stats, leave balance, check-in card with live address
- Recharts-powered attendance trend charts and department breakdowns
- Activity logs and audit trail
- CSV export for all major data sets

### 🔔 Notifications
- Real-time in-app notification system
- Unread badge counts
- Notification types: leave approval, rejection, welcome, warning

### 📱 Mobile App Quality
- Mobile-first responsive design tested on 320px – 1400px
- Bottom navigation bar on mobile (5 role-specific tabs)
- Full-screen camera modal for geotagged check-in
- Touch-optimised tap targets
- No horizontal scroll on any screen

### 🎨 UI / UX
- Clean SaaS sidebar — white background, grouped navigation, icons with tooltips
- Command palette (`⌘K` / `Ctrl+K`) — global search across pages and employees
- Dark / light theme toggle
- Onboarding wizard for new employees (multi-step profile completion)
- Professional empty states, loading skeletons, error boundaries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | MongoDB Atlas via Prisma ORM 6 |
| Auth | JWT + bcrypt |
| Styling | Tailwind CSS 3, Radix UI, shadcn/ui |
| Charts | Recharts |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack React Query v5 |
| Notifications | Sonner |
| Email | Nodemailer + SMTP |
| Face Verification | @vladmandic/face-api (self-hosted models) |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Maps | Google Maps API (optional) |
| Export | xlsx |
| Deployment | Vercel |

---

## Project Structure

```
anvesync/
├── app/
│   ├── (auth)/
│   │   └── login/                  # Login page
│   ├── api/
│   │   ├── auth/                   # Login, logout, me, change-password
│   │   ├── attendance/             # Check-in, check-out, history, map
│   │   │   ├── checkin/            # GPS + face + liveness check-in
│   │   │   ├── checkout/           # GPS + face check-out
│   │   │   ├── today/              # Today's record with address
│   │   │   ├── photo/              # Lazy-load single attendance photo
│   │   │   ├── today-checkins/     # Admin: all today's check-ins
│   │   │   ├── review-queue/       # Flagged records for HR review
│   │   │   └── export/             # CSV export
│   │   ├── employees/              # Employee CRUD
│   │   ├── leave/                  # Leave requests
│   │   ├── payroll/                # Payroll generation
│   │   ├── recruitment/            # Jobs + candidates
│   │   ├── tickets/                # Helpdesk tickets
│   │   ├── startups/               # Incubation management
│   │   ├── announcements/          # Company announcements
│   │   ├── profile/                # Profile + avatar + documents
│   │   ├── geofences/              # Geofence CRUD
│   │   ├── policies/               # Attendance policies
│   │   ├── mentor/                 # Mentor reviews
│   │   ├── notifications/          # In-app notifications
│   │   ├── analytics/              # Stats + trend data
│   │   ├── dashboard/stats/        # Dashboard KPIs
│   │   └── settings/               # Office config, liveness settings
│   └── dashboard/
│       ├── page.tsx                # Dashboard (admin + employee views)
│       ├── employees/              # Employee directory + detail
│       ├── attendance/             # Attendance history + geotagged selfies
│       ├── attendance-map/         # Live map + today's check-in photos
│       ├── attendance-review/      # HR review queue
│       ├── leave/                  # Leave requests
│       ├── payroll/                # Payroll management
│       ├── my-payroll/             # Employee payslip view
│       ├── recruitment/            # Jobs + candidate pipeline
│       ├── helpdesk/               # Admin ticket management
│       ├── tickets/                # Employee ticket view
│       ├── startups/               # Startup directory
│       ├── events/                 # Events management
│       ├── mentor/                 # Mentor reviews
│       ├── departments/            # Department management
│       ├── announcements/          # Company announcements
│       ├── analytics/              # Charts + insights
│       ├── reports/                # CSV export
│       ├── profile/                # Employee self-service profile
│       ├── directory/              # Company directory
│       ├── my-team/                # Manager's team view
│       ├── exits/                  # Exit management (admin)
│       ├── resignation/            # Employee resignation portal
│       ├── security/               # Login history
│       ├── activity-logs/          # Admin audit logs
│       ├── system-health/          # Platform status
│       ├── geofences/              # Geofence management
│       ├── policies/               # Attendance policy editor
│       └── settings/               # User + office settings
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx             # Collapsible sidebar with role-based nav
│   │   ├── TopNav.tsx              # Sticky header with notifications
│   │   └── BottomNav.tsx           # Mobile bottom navigation (5 tabs)
│   ├── attendance/
│   │   └── AttendanceCaptureModal  # Camera + GPS + geotag watermark
│   ├── profile/
│   │   └── AvatarUploader.tsx      # Camera-button overlay, crop preview
│   ├── search/
│   │   └── CommandPalette.tsx      # ⌘K global search
│   ├── onboarding/
│   │   └── OnboardingWizard.tsx    # Multi-step new employee onboarding
│   └── ui/                         # shadcn/ui + custom components
├── hooks/                          # TanStack React Query hooks
├── lib/
│   ├── auth.ts                     # JWT sign/verify/extract
│   ├── db.ts                       # Prisma client singleton
│   ├── geocode.ts                  # Reverse geocoding (Nominatim)
│   ├── geotag.ts                   # Canvas watermark + client geocoding
│   ├── geofence.ts                 # Haversine distance calculation
│   ├── policyEngine.ts             # Attendance policy evaluation
│   ├── faceVerify.ts               # face-api.js face comparison
│   ├── livenessAdapter.ts          # Blink / passive liveness check
│   ├── attendanceAudit.ts          # Audit trail fire-and-forget
│   └── utils.ts                    # Shared utilities
├── prisma/
│   └── schema.prisma               # MongoDB data models (30 models)
├── public/
│   └── models/                     # Self-hosted face-api models (~6.7MB)
├── types/
│   └── index.ts                    # Shared TypeScript types
├── .env.example                    # Environment variable template
└── vercel.json                     # Vercel deployment configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database (Atlas recommended — free M0 tier works)
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/harshraj677/HRMS.git
cd HRMS/anvesync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/anvesync
JWT_SECRET=your-random-32-char-secret-here

# Optional — Google Maps (for attendance map)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Optional — SMTP email (for welcome emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Anvesync HRMS <your@gmail.com>
```

### 4. Generate Prisma client and push schema

```bash
npx prisma generate
npx prisma db push
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Create your first admin account

Use the seed script or insert directly via MongoDB Atlas UI / Compass:

```bash
# Or create admin via the API (one-time setup):
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Admin","email":"admin@anvesana.org","role":"admin"}'
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing (min 32 chars) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key — for live attendance map |
| `SMTP_HOST` | ❌ | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | ❌ | SMTP port (usually `587` for TLS) |
| `SMTP_USER` | ❌ | SMTP sender email address |
| `SMTP_PASS` | ❌ | SMTP password or Gmail App Password |
| `SMTP_FROM` | ❌ | Sender display name and address |

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords → Generate for Mail.

> **JWT Secret:** Generate a secure one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Deploying to Vercel

### 1. Push to GitHub (already done)

The repository is at: `https://github.com/harshraj677/HRMS`

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select `harshraj677/HRMS`
3. Set **Root Directory** → `anvesync`
4. Framework will auto-detect as **Next.js**

### 3. Add environment variables

In the Vercel dashboard under **Environment Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your MongoDB Atlas string |
| `JWT_SECRET` | Random 32+ char string |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | *(optional)* |
| `SMTP_HOST` | *(optional)* |
| `SMTP_PORT` | *(optional)* |
| `SMTP_USER` | *(optional)* |
| `SMTP_PASS` | *(optional)* |
| `SMTP_FROM` | *(optional)* |

### 4. Deploy

Click **Deploy**. Vercel will run:

```bash
prisma generate && next build
```

Build time: ~2–3 minutes. The `vercel.json` sets API function timeout to **30 seconds**.

### 5. After first deploy

Open MongoDB Atlas → **Network Access** → ensure `0.0.0.0/0` is allowed so Vercel's serverless functions can connect.

---

## Admin Configuration

After your first deploy, log in as admin and go to **Settings → Office Settings**:

| Setting | Description |
|---|---|
| **Office WiFi Name** | Label for the office network (display only) |
| **Office WiFi IP** | Register current public IP while on office WiFi — click **Auto-Detect** |
| **Office Latitude / Longitude** | GPS coordinates of your office |
| **Geofence Radius** | Max distance from office allowed for check-in (default: 1000m) |

### Attendance Policies

Go to **Geofences** → create a boundary → Go to **Policies** → create a policy linking geofences with an enforcement mode:

| Mode | Behaviour |
|---|---|
| `soft` | Warn employee but allow check-in |
| `hard` | Block check-in entirely |
| `allow-if-matched` | Allow but flag for review if outside |

---

## Database Schema

30 Prisma models on MongoDB:

| Model | Description |
|---|---|
| `Employee` | Core user record — role, department, leave balance, password hash |
| `EmployeeProfile` | Extended personal, address, education, professional data |
| `EmployeeDocument` | Uploaded certificates, degrees, resumes |
| `SalaryStructure` | Earnings + deductions + banking info per employee |
| `Attendance` | Daily check-in/out — GPS, photo, face score, liveness, address |
| `AttendanceAudit` | Full change history for each attendance record |
| `AttendancePolicy` | Geofence enforcement rules |
| `DailySummary` | Aggregated daily attendance stats |
| `LeaveRequest` | Leave application with approval workflow |
| `Payroll` | Monthly payroll record with full salary breakdown |
| `Job` | Recruitment job posting |
| `Candidate` | Candidate pipeline record |
| `Ticket` | Support / helpdesk ticket |
| `TicketMessage` | Ticket conversation thread |
| `Startup` | Incubated startup record |
| `StartupMilestone` | Startup progress milestones |
| `Event` | Workshop, hackathon, demo day |
| `EventRegistration` | Employee event attendance |
| `MentorReview` | Mentor scoring record |
| `Announcement` | Company-wide or department-targeted announcement |
| `Resignation` | Employee exit workflow |
| `Notification` | In-app notification |
| `LoginHistory` | Per-employee login audit |
| `SuspiciousLog` | Flagged check-in attempts |
| `AuditLog` | Admin action audit trail |
| `ActivityLog` | User action log |
| `Archive` | Soft-deleted record snapshots |
| `Geofence` | Circle or polygon geofence definition |
| `Department` | Company department |
| `Designation` | Job title / level |
| `Settings` | Key-value store for app configuration |

---

## Security

| Threat | Mitigation |
|---|---|
| Fake GPS / mock location | Detected via `mocked` flag from browser — request blocked + logged |
| Geofence bypass | Server-side Haversine distance check — client cannot override |
| Wrong WiFi | Public IP compared against registered office IP |
| Photo spoofing | Liveness detection (blink challenge) + face similarity check |
| Token theft | JWT in `HttpOnly` cookie — not accessible to JavaScript |
| Weak passwords | bcrypt 12 rounds; force-change on first login |
| Unauthorised routes | `RoleGuard` component + server-side JWT verification on all API routes |

---

## API Reference

All API routes require a valid JWT cookie. Admin-only routes return `403` for non-admin requests.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/checkin` | Check in with GPS + photo |
| POST | `/api/attendance/checkout` | Check out |
| GET | `/api/attendance/today` | Today's record for current user |
| GET | `/api/attendance` | History (employee: own, admin: all) |
| GET | `/api/attendance/photo?id=&which=in\|out` | Lazy-load single photo |
| GET | `/api/attendance/today-checkins` | Admin: today's check-ins with addresses |
| GET | `/api/attendance/map` | Map markers for live attendance map |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee + send welcome email |
| GET | `/api/employees/:id` | Get employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Soft-delete employee |

### Leave
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leave` | List leave requests |
| POST | `/api/leave` | Submit leave request |
| PUT | `/api/leave/:id` | Approve / reject (admin) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma db push` | Push schema changes to MongoDB |
| `npx prisma studio` | Open Prisma database browser |

---

## License

Private — Anvesana Innovation & Entrepreneurial Forum.  
Not licensed for public distribution or commercial use.

---

<p align="center">
  Built with ❤️ for <strong>Anvesana Innovation & Entrepreneurial Forum</strong>
</p>
