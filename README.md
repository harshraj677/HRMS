<img src="public/logo.jpg" alt="AnveCore HRMS" width="64" height="64" style="border-radius:12px" />

# AnveCore HRMS

> Enterprise-grade Human Resource Management System built for **Anvesana Innovation & Entrepreneurial Forum**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://anvecore.vercel.app)
[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?logo=android)](https://capacitorjs.com)

A full-stack, mobile-first workforce management platform built with Next.js 15 App Router, TypeScript, MongoDB, and Tailwind CSS. AnveCore covers the full employee lifecycle — invite-based onboarding with admin approval, organization hierarchy visualization, geotagged attendance, leave, payroll, task management, performance analytics, recruitment, helpdesk, and startup incubation — with enterprise-grade security and a polished SaaS-quality UI on desktop and mobile.

**Live:** [anvecore.vercel.app](https://anvecore.vercel.app)

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
- Role-based access control — `admin` / `hr` / `manager` / `employee`

### 🪪 Onboarding & Approval Workflow
- **Invite-only account creation** — admin invites with just email + role (+ optional department); the system generates a secure temp password and emails a branded onboarding invite
- Forced first-login password change → 9-step profile wizard (personal, address, emergency contact, education, professional info, **bank details**, identity documents, **profile photo**)
- Full-screen onboarding gate blocks all dashboard access until the profile is submitted and approved
- Admin approval queue (`/dashboard/onboarding`) — 5 KPI cards (pending invitations, pending reviews, approved, rejected, recently joined) with filterable status tabs
- Detailed profile review panel — personal/address/education/professional/bank info, uploaded documents, avatar
- Approve, or reject with a reason — employee sees the rejection reason, edits, and resubmits
- Notifications at every stage: invite sent, profile submitted/resubmitted, approved, rejected
- Legacy employees created before this feature (`approvalStatus: null`) are treated as fully `ACTIVE` — no migration needed

### 👥 Employee Management
- Full CRUD — invite, view, edit, soft-delete employees
- Employee directory with search and department filters
- Profile completeness tracking
- Document upload and verification (certificates, degrees, resumes, ID proofs)
- Salary structure management per employee
- Role and approval-status badges across employee lists

### 🧭 Organization Structure
- **Recursive org-tree visualization** built from each employee's reporting manager (`reportingManagerId`)
- Connector lines between managers and direct reports, with the top two levels pre-expanded
- Expand / collapse any branch — shows live "N reports" counts
- Live search across name, email, department, and position, with match highlighting and dimming of non-matching nodes
- Filter by department, designation, and location
- Zoom in / out (50%–150%), reset, and **fullscreen** mode for large org charts
- Stats row — total employees, departments, managers, and org depth
- **Role-based editing** — admins/HR can reassign an employee's reporting manager directly from the detail panel
- **My Team** view automatically scopes to a manager's full reporting subtree (not just direct reports)

### 📍 Geotagged Attendance
- One-click **Check In / Check Out** from dashboard and attendance page
- **Office Zone Geofencing** — blocks check-in beyond a configurable radius from the office GPS location
- **Geotagged Selfie Watermark** — canvas-stamped photo with employee name, timestamp, GPS coordinates, and reverse-geocoded address (like a geotag camera app)
- **Reverse Geocoding** — live address automatically saved from latitude/longitude using OpenStreetMap Nominatim
- **Office WiFi Verification** — check-in blocked if not on registered office network
- **Fake GPS detection** — mock location apps are detected and logged
- **Liveness detection** — blink challenge to prevent photo spoofing
- **Face verification** — selfie compared against profile photo using face-api.js
- **Attendance policy engine** — evaluates check-ins against a single configurable office zone with `soft` / `hard` / `allow-if-matched` enforcement modes, remote-work allowances, and face-verification requirements
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
- Admin payroll dashboard with payment status tracking, expandable earnings/deductions breakdown
- Mobile card view with the same expandable breakdown and pay/revert/delete actions
- Employee payslip view

### ✅ Task Management
- **Kanban board** with drag-and-drop status columns (powered by dnd-kit)
- **Calendar view** of tasks grouped by due date
- **Org-tree-scoped assignment** — managers can assign tasks to anyone within their reporting subtree; admins/HR can assign to anyone
- Per-task comment threads and activity/history log
- Filters by assignee, status, priority, and due date
- Task analytics — completion rates, overdue counts, workload distribution

### 🏆 Performance & Analytics
- Automated per-employee scoring across attendance, task completion, and leave usage, rolled up into an overall performance score
- **Score ring** visualization with historical trend over selectable periods (monthly / quarterly)
- **Advisory-only recommendations** — generated read-only with an explicit disclaimer; no code path automatically changes salary, role, or promotion status
- Role-scoped views — employees see their own score and recommendations; admins see an org-wide overview and can trigger score generation

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
- **Admin dashboard** — 8 KPI cards: employees, attendance, leave, payroll, open jobs, tickets, startups, and active incubation projects
- **Employee dashboard** — attendance stats, leave balance, check-in card with live address
- Recharts-powered attendance trend charts and department breakdowns
- Activity logs and audit trail
- CSV export for all major data sets

### 🔔 Notifications
- Real-time in-app notification system with unread badge counts
- Covers the full employee lifecycle: leave approval/rejection, onboarding invite, profile submitted/resubmitted, profile approved/rejected, task assignments, attendance, and security alerts

### 📱 Mobile App Quality
- Mobile-first responsive design tested on 320px – 1400px
- **Full slide-in navigation drawer** — hamburger menu in the top bar opens every role-based nav group (not just a 5-item bottom bar), with sign-out
- Bottom navigation bar for quick access on mobile
- Tables (Payroll, Attendance Review) collapse into expandable mobile cards mirroring the desktop columns
- Responsive grids for forms, salary structure, and stepper components
- Full-screen camera modal for geotagged check-in
- Touch-optimised tap targets, no horizontal scroll on any screen
- **Capacitor Android shell** — packages the web app as a native Android APK

### 🎨 UI / UX
- Clean SaaS sidebar — white background, grouped navigation, icons with tooltips
- Command palette (`⌘K` / `Ctrl+K`) — global search across pages and employees
- Dark / light theme toggle
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
| Drag & Drop | @dnd-kit (core, sortable) |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack React Query v5 |
| Notifications | Sonner |
| Email | Nodemailer + SMTP |
| Face Verification | @vladmandic/face-api (self-hosted models) |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Maps | Google Maps API (optional) |
| Export | xlsx |
| Mobile Shell | Capacitor (Android) |
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
│   │   ├── employees/              # Employee CRUD + invite flow
│   │   ├── onboarding/             # Approval queue, submit, approve/reject
│   │   │   └── [id]/               # Approve / reject a single profile
│   │   ├── org/                    # Org tree, my-team, departments, designations, directory
│   │   ├── tasks/                  # Task CRUD, comments, activity, analytics, assignees
│   │   ├── performance/            # Performance scoring + advisory recommendations
│   │   ├── leave/                  # Leave requests
│   │   ├── payroll/                # Payroll generation
│   │   ├── recruitment/            # Jobs + candidates
│   │   ├── tickets/                # Helpdesk tickets
│   │   ├── startups/                # Incubation management
│   │   ├── announcements/          # Company announcements
│   │   ├── profile/                # Profile + avatar + documents
│   │   ├── policies/               # Attendance policies
│   │   ├── mentor/                 # Mentor reviews
│   │   ├── notifications/          # In-app notifications
│   │   ├── analytics/              # Stats + trend data
│   │   ├── dashboard/stats/        # Dashboard KPIs
│   │   └── settings/               # Office zone, liveness, and org settings
│   └── dashboard/
│       ├── page.tsx                # Dashboard (admin + employee views)
│       ├── employees/              # Employee directory + detail + invite
│       ├── onboarding/             # Admin profile approval queue
│       ├── org-structure/          # Org-tree visualization
│       ├── attendance/             # Attendance history + geotagged selfies
│       ├── attendance-map/         # Live map + today's check-in photos
│       ├── attendance-review/      # HR review queue
│       ├── leave/                  # Leave requests
│       ├── payroll/                # Payroll management
│       ├── my-payroll/             # Employee payslip view
│       ├── tasks/                  # Kanban board + calendar
│       ├── performance/            # Performance scores + recommendations
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
│       ├── my-team/                # Manager's reporting-subtree view
│       ├── exits/                  # Exit management (admin)
│       ├── resignation/            # Employee resignation portal
│       ├── security/               # Login history
│       ├── activity-logs/          # Admin audit logs
│       ├── system-health/          # Platform status
│       ├── policies/               # Attendance policy editor
│       └── settings/               # User, office zone, and org settings
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx             # Collapsible sidebar with role-based nav
│   │   ├── TopNav.tsx              # Sticky header with notifications + hamburger
│   │   ├── MobileNavDrawer.tsx     # Full slide-in nav drawer for mobile
│   │   └── BottomNav.tsx           # Mobile bottom navigation
│   ├── attendance/
│   │   └── AttendanceCaptureModal  # Camera + GPS + geotag watermark
│   ├── profile/
│   │   └── AvatarUploader.tsx      # Camera-button overlay, crop preview
│   ├── search/
│   │   └── CommandPalette.tsx      # ⌘K global search
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx    # 9-step new employee onboarding wizard
│   │   └── PendingApprovalScreen.tsx
│   ├── tasks/                      # Kanban board, calendar, task cards
│   ├── performance/
│   │   └── ScoreRing.tsx           # Circular performance score visualization
│   └── ui/                         # shadcn/ui + custom components
├── hooks/                          # TanStack React Query hooks
├── lib/
│   ├── auth.ts                     # JWT sign/verify/extract
│   ├── db.ts / prisma.ts           # Prisma client singleton
│   ├── roles.ts                    # Role list + RBAC helpers
│   ├── orgHierarchy.ts             # Org forest builder, reporting-subtree helpers
│   ├── orgTree.ts                  # Org-tree search/filter/stats helpers
│   ├── onboarding.ts               # Approval-status helpers
│   ├── taskAccess.ts               # Org-tree-scoped task assignment
│   ├── performance.ts              # Scoring + advisory recommendations
│   ├── geocode.ts                  # Reverse geocoding (Nominatim)
│   ├── geotag.ts                   # Canvas watermark + client geocoding
│   ├── geofence.ts                 # Haversine distance + office zone helpers
│   ├── policyEngine.ts             # Attendance policy evaluation
│   ├── faceVerify.ts               # face-api.js face comparison
│   ├── livenessAdapter.ts          # Blink / passive liveness check
│   ├── attendanceAudit.ts          # Audit trail fire-and-forget
│   ├── secureDelete.ts             # Permanent-purge helpers (super_admin only)
│   └── utils.ts                    # Shared utilities
├── prisma/
│   ├── schema.prisma               # MongoDB data models (37 models)
│   └── seed.ts                     # Seed initial admin + sample employees
├── android/                         # Capacitor Android shell (APK build)
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
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/anvecore
JWT_SECRET=your-random-32-char-secret-here

# Optional — Google Maps (for attendance map)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Optional — SMTP email (for onboarding invite emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=AnveCore HRMS <your@gmail.com>
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

Run the seed script to create an initial admin and sample employees:

```bash
npx ts-node prisma/seed.ts
```

Or create an admin directly via the API (one-time setup — subsequent accounts should go through the **Invite Employee** flow in `/dashboard/employees`):

```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@anvesana.org","role":"admin"}'
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

Build time: ~2–3 minutes. The `vercel.json` sets API function timeout to **30 seconds**. The production deployment is aliased to [anvecore.vercel.app](https://anvecore.vercel.app).

### 5. After first deploy

Open MongoDB Atlas → **Network Access** → ensure `0.0.0.0/0` is allowed so Vercel's serverless functions can connect.

---

## Admin Configuration

After your first deploy, log in as admin and go to **Settings → Office Settings**:

| Setting | Description |
|---|---|
| **Office WiFi Name** | Label for the office network (display only) |
| **Office WiFi IP** | Register current public IP while on office WiFi — click **Auto-Detect** |
| **Office Latitude / Longitude** | GPS coordinates of your office (the "office zone" center) |
| **Office Zone Radius** | Max distance from the office zone allowed for check-in (default: 1000m) |

### Attendance Policies

Go to **Settings → Office Settings** to configure the office zone, then go to **Policies** to create or edit the attendance policy. Each policy evaluates check-ins against the configured office zone and an enforcement mode:

| Mode | Behaviour |
|---|---|
| `soft` | Warn employee but allow check-in |
| `hard` | Block check-in entirely (unless a manual override is requested and allowed) |
| `allow-if-matched` | Allow but flag for HR review if outside the office zone |

Policies can also enable **remote work** (skip location checks entirely) and require **face verification** on check-in.

### Organization Hierarchy

Go to **Organization Structure** (admin/HR) to view the company org tree. Select any employee in the tree to open their detail panel, where admins/HR can reassign their **reporting manager** — this immediately updates the tree, `My Team` scoping for managers, and org-tree-based task assignment.

### Onboarding Approvals

Go to **Onboarding** (admin) to review profiles submitted by newly invited employees. Each row can be approved (grants full dashboard access) or rejected with a reason (employee can edit and resubmit).

---

## Database Schema

37 Prisma models on MongoDB:

| Model | Description |
|---|---|
| `Employee` | Core user record — role, department, reporting manager, approval status, password hash |
| `EmployeeProfile` | Extended personal, address, education, professional, and banking data |
| `EmployeeDocument` | Uploaded certificates, degrees, resumes, ID proofs |
| `SalaryStructure` | Earnings + deductions + banking info per employee |
| `Attendance` | Daily check-in/out — GPS, photo, face score, liveness, address |
| `AttendanceAudit` | Full change history for each attendance record |
| `AttendancePolicy` | Office-zone enforcement rules (soft / hard / allow-if-matched) |
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
| `Task` | Assignable work item — status, priority, due date, org-scoped assignment |
| `TaskComment` | Comment thread on a task |
| `TaskProgressLog` | Activity/history log per task |
| `PerformanceRecord` | Per-period attendance/task/leave scores and overall rating |
| `FeedbackEntry` | Feedback contributing to performance records |
| `TrainingRecord` | Training/certification record per employee |
| `PerformanceRecommendation` | Advisory-only, read-only performance recommendation |
| `Notification` | In-app notification |
| `LoginHistory` | Per-employee login audit |
| `SuspiciousLog` | Flagged check-in attempts |
| `AuditLog` | Admin action audit trail |
| `ActivityLog` | User action log |
| `Archive` | Soft-deleted record snapshots |
| `Department` | Company department |
| `Designation` | Job title / level |
| `Settings` | Key-value store for app configuration (office zone, org info, feature flags) |

---

## Security

| Threat | Mitigation |
|---|---|
| Fake GPS / mock location | Detected via `mocked` flag from browser — request blocked + logged |
| Office zone bypass | Server-side Haversine distance check — client cannot override |
| Wrong WiFi | Public IP compared against registered office IP |
| Photo spoofing | Liveness detection (blink challenge) + face similarity check |
| Token theft | JWT in `HttpOnly` cookie — not accessible to JavaScript |
| Weak passwords | bcrypt 12 rounds; force-change on first login |
| Unauthorised dashboard access | `approvalStatus`-driven onboarding gate blocks unapproved accounts |
| Unauthorised routes | `RoleGuard` component + server-side JWT verification on all API routes |
| Unscoped task/team access | Org-tree-based scoping (`getOrgScopedEmployeeIds`) restricts managers to their reporting subtree |

---

## API Reference

All API routes require a valid JWT cookie. Admin-only routes return `403` for non-admin requests.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Get current user (incl. role, approval status) |
| POST | `/api/auth/change-password` | Change password (flips `approvalStatus` to `PROFILE_IN_PROGRESS` on first login) |

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
| GET/PUT | `/api/attendance/review-queue` | HR review queue for flagged records |
| GET | `/api/attendance/export` | CSV export |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Invite employee (email + role, optional department) — sends onboarding email |
| GET | `/api/employees/:id` | Get employee |
| PUT | `/api/employees/:id` | Update employee (self: name/phone; admin/HR: full record + reporting manager) |
| DELETE | `/api/employees/:id` | Soft-delete employee |

### Onboarding & Approvals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/onboarding` | Admin: approval queue + stats (pending invitations/reviews, approved, rejected, recently joined) |
| POST | `/api/onboarding/submit` | Employee submits completed profile for review |
| PATCH | `/api/onboarding/:id` | Admin: `{ action: "approve" }` or `{ action: "reject", reason }` |

### Organization
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/org/tree` | Full org tree data (flat employee list with `reportingManagerId`) |
| GET/PUT | `/api/org/my-team` | Manager's reporting subtree (admin/HR see all); PUT reassigns a reporting manager |
| GET | `/api/org/directory` | Company directory |
| GET/POST | `/api/org/departments` | List / create departments |
| PUT/DELETE | `/api/org/departments/:id` | Update / delete a department |
| GET/POST | `/api/org/designations` | List / create designations |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/tasks` | List (org-scoped) / create tasks |
| GET/PUT/DELETE | `/api/tasks/:id` | Get / update / delete a task |
| GET/POST | `/api/tasks/:id/comments` | Task comment thread |
| GET | `/api/tasks/:id/activity` | Task activity / history log |
| GET | `/api/tasks/assignees` | List of employees eligible to be assigned (org-scoped) |
| GET | `/api/tasks/analytics` | Completion rates, overdue counts, workload breakdown |

### Performance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/performance` | Role-scoped overview (employee: own; admin: org-wide) |
| POST | `/api/performance` | Admin: generate performance scores for a period |
| GET | `/api/performance/:id` | Employee trend history + advisory recommendations |

### Leave
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leave` | List leave requests |
| POST | `/api/leave` | Submit leave request |
| PUT | `/api/leave/:id` | Approve / reject (admin) |

### Payroll
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/payroll` | List payroll records (admin) |
| GET | `/api/payroll/my` | Employee: own payslips |
| POST | `/api/payroll/generate` | Admin: generate monthly payroll |
| GET/PUT | `/api/payroll/:id` | Get / update a payroll record (mark paid, revert) |
| GET/PUT | `/api/payroll/salary-structure/:employeeId` | Get / upsert an employee's salary structure |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET/PUT | `/api/policies` | Attendance policy configuration |
| GET/PUT | `/api/settings` | Office zone, liveness, and organisation settings |
| GET | `/api/notifications` | In-app notifications + unread counts |
| GET | `/api/dashboard/stats` | Admin/employee dashboard KPIs |
| GET | `/api/analytics` | Attendance trends + department breakdowns |

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
| `npm run cap:sync` | Sync web build into the Capacitor Android project |
| `npm run cap:open` | Open the Android project in Android Studio |
| `npm run cap:run` | Build and run the Android app on a device/emulator |

---

## License

Private — Anvesana Innovation & Entrepreneurial Forum.  
Not licensed for public distribution or commercial use.

---

<p align="center">
  Built with ❤️ for <strong>Anvesana Innovation & Entrepreneurial Forum</strong>
</p>
