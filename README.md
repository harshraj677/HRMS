# Anvesync — Workforce Management Platform

> Built for **Anvesana Innovation & Entrepreneurial Forum**

A full-stack, mobile-first workforce management platform built with **Next.js**, **TypeScript**, **MongoDB**, and **Tailwind CSS**. Designed for managing employees, attendance, leave, startups, and internal operations — with enterprise-grade security and a polished UI.

**Live:** [anvesync.vercel.app](https://anvesync.vercel.app)

---

## Features

### Authentication & Security
- JWT-based login with `HttpOnly` cookies
- bcrypt password hashing (12 salt rounds)
- `mustChangePassword` flag enforced on first login
- Login history tracking per employee

### Employee Management
- Add, view, edit, and soft-delete employees
- Auto-generate secure temporary password on creation
- Automatic welcome email via **Gmail SMTP** (Nodemailer)
- Role-based access: `admin` / `employee`
- Department, position, leave balance tracking
- Audit log for all admin actions

### Attendance & Check-in Security
- One-click Check In / Check Out from dashboard and attendance page
- **GPS Geofencing** — blocks check-in beyond configured radius from office
- **Office WiFi Verification** — admin registers office public IP; check-in blocked if employee is on a different network
- Mock/fake GPS detection
- Suspicious activity logging (`wifi_mismatch`, `geofence_violation`, `mock_location_detected`)
- Attendance map showing real-time employee locations

### Leave Management
- Employees submit leave requests with date range and reason
- Admin approves or rejects with one click
- Leave balance auto-deducted on approval
- Pending requests shown on admin dashboard

### Startup & Incubation Management
- Full CRUD for incubated startups
- Track stage, funding, mentor, team size, progress
- Soft-delete with archive support

### Notifications
- Real-time in-app notification system
- Welcome notifications on account creation
- Unread badge counts

### Analytics & Dashboard
- KPI stat cards (attendance %, late arrivals, leave balance, pending requests)
- Admin overview: total employees, present today, on leave
- Recharts-powered visualisations

### UI & UX
- Mobile-first responsive design (tested on iPhone, Android)
- Framer Motion animations throughout
- Premium `AlertBanner` component for inline error states (replaces raw toasts)
- Dark/light theme support
- Smooth tab navigation with gradient scroll indicators

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | MongoDB (via Prisma ORM) |
| Auth | JWT + bcrypt |
| Email | Nodemailer + Gmail SMTP |
| UI | Tailwind CSS, Radix UI, shadcn/ui |
| Charts | Recharts |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack React Query |
| Notifications | Sonner (toast) |
| Deployment | Vercel |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/              # Login, logout, me
│   │   ├── employees/         # CRUD + onboarding email
│   │   ├── attendance/        # Check-in, check-out, map, today
│   │   ├── leave/             # Submit, approve, reject
│   │   ├── startups/          # Incubation management
│   │   ├── notifications/     # Read, mark read
│   │   ├── settings/          # Office config, detect-ip
│   │   └── dashboard/         # Aggregated stats
│   └── dashboard/
│       ├── page.tsx           # Main dashboard (admin + employee views)
│       ├── employees/         # Employee directory & detail
│       ├── attendance/        # Attendance history + check-in card
│       ├── leave/             # Leave requests
│       ├── startups/          # Startup directory
│       ├── analytics/         # Charts & reports
│       └── settings/          # Profile, security, office settings
├── components/
│   ├── ui/                    # shadcn/ui + AlertBanner
│   └── RoleGuard.tsx          # Admin-only route guard
├── hooks/                     # React Query hooks (attendance, employees, leave…)
├── lib/
│   ├── auth.ts                # JWT sign/verify
│   ├── db.ts                  # Prisma client
│   ├── email.ts               # Nodemailer Gmail SMTP
│   ├── geofence.ts            # Haversine distance + geofence check
│   └── utils.ts               # Shared utilities
└── prisma/
    └── schema.prisma          # MongoDB schema
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB database (Atlas or local)
- Gmail account with App Password enabled

### 1. Clone the repository

```bash
git clone https://github.com/harshraj677/anvesync.git
cd anvesync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/dbname"

# Auth
JWT_SECRET="your_secure_jwt_secret"

# Email (Gmail SMTP)
EMAIL_USER="your_gmail@gmail.com"
EMAIL_PASS="your_16_char_app_password"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_google_maps_key"
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords → create one for Mail.

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables — Vercel Deployment

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `EMAIL_USER` | Gmail address used as sender |
| `EMAIL_PASS` | Gmail App Password (not your account password) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key for attendance map |

---

## Office Settings (Admin)

After deploying, go to **Settings → Office Settings** as admin to configure:

| Setting | Description |
|---|---|
| Office WiFi Name | Label for the office network (display only) |
| Office WiFi IP | Register current public IP while on office WiFi — click **Detect** |
| Office Latitude / Longitude | GPS coordinates of the office |
| Geofence Radius (meters) | Max distance from office allowed for check-in (default: 1000m) |

Employees can only check in when:
1. Their public IP matches the registered office WiFi IP *(if configured)*
2. They are within the geofence radius

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Database Schema

| Model | Description |
|---|---|
| `Employee` | Core user record — role, department, leave balance, password hash |
| `Attendance` | Daily check-in/check-out with GPS coordinates and IP |
| `LeaveRequest` | Leave application with approval status |
| `SuspiciousLog` | Flagged check-in attempts (fake GPS, wrong WiFi, geofence breach) |
| `LoginHistory` | Per-employee login audit trail |
| `Notification` | In-app notification records |
| `Startup` | Incubated startup records |
| `Settings` | Key-value store for office configuration |
| `AuditLog` | Admin action audit trail |
| `Archive` | Soft-deleted record snapshots |

---

## License

Private — Anvesana Innovation & Entrepreneurial Forum. Not licensed for public distribution.
