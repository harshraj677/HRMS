# Anvesana Employee Management System

A full-stack employee management web application built with **Next.js 15**, **Prisma**, **MySQL**, and **Tailwind CSS**. It provides an admin dashboard to manage employees, attendance, leave requests, messaging, and analytics.

---

## Features

- **Authentication** — JWT-based login/logout with bcrypt password hashing
- **Dashboard** — Overview cards, attendance trend charts, leave distribution charts, and recent activity feed
- **Employee Management** — View, add, and manage employee profiles
- **Attendance Tracking** — Check-in/check-out records per employee
- **Leave Management** — Submit and approve/reject leave requests with leave balance tracking
- **Messaging** — Internal messaging between employees
- **Calendar** — Visual calendar for scheduling and events
- **Analytics** — Data visualizations using Recharts
- **Settings** — Application and user preference settings
- **Dark / Light Theme** — via `next-themes`
- **Responsive UI** — Built with Radix UI primitives and Tailwind CSS

---

## Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Framework   | Next.js 15 (App Router)                 |
| Language    | TypeScript                              |
| Database    | MySQL (via Prisma ORM)                  |
| Auth        | JSON Web Tokens + bcrypt                |
| UI          | Tailwind CSS, Radix UI, shadcn/ui       |
| Charts      | Recharts                                |
| Animations  | Framer Motion                           |
| Forms       | React Hook Form + Zod                   |
| Data Fetching | TanStack React Query + Axios          |
| Notifications | Sonner (toast)                        |

---

## Project Structure

```
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── page.tsx           # Admin dashboard home
│   │   ├── employees/         # Employee list & detail pages
│   │   ├── attendance/        # Attendance tracking
│   │   ├── leave/             # Leave requests
│   │   ├── messages/          # Internal messaging
│   │   ├── analytics/         # Analytics & reports
│   │   ├── calendar/          # Calendar view
│   │   └── settings/          # Settings
│   └── api/                   # API routes (auth)
├── components/
│   ├── dashboard/             # Dashboard-specific components
│   ├── layout/                # Sidebar, TopNav
│   └── ui/                    # shadcn/ui components
├── hooks/                     # Custom React Query hooks
├── lib/                       # Utilities, auth helpers, DB client, API
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeder
│   └── migrations/            # Migration history
└── types/                     # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL database

### 1. Clone the repository

```bash
git clone <repository-url>
cd anvesana-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your_jwt_secret_key"
```

### 4. Set up the database

```bash
# Run Prisma migrations
npx prisma migrate deploy

# (Optional) Seed the database with sample data
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start development server           |
| `npm run build`   | Build for production               |
| `npm run start`   | Start production server            |
| `npm run lint`    | Run ESLint                         |

---

## Database Schema

| Model          | Description                                      |
|----------------|--------------------------------------------------|
| `Employee`     | Core employee record with role and leave balance |
| `Attendance`   | Daily check-in / check-out records               |
| `LeaveRequest` | Leave applications with approval status          |
| `Message`      | Internal messages between employees              |
| `Department`   | Department definitions                           |
| `Role`         | Role definitions                                 |

---

## License

This project is private and not licensed for public distribution.
