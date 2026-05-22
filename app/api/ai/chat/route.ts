import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

// ── Intent classifier ────────────────────────────────────────────────────────

type Intent =
  | "leave_balance" | "leave_apply" | "leave_policy"
  | "attendance_status" | "attendance_policy"
  | "payroll_info" | "payslip"
  | "ticket_status" | "raise_ticket"
  | "resignation" | "exit_process"
  | "org_info" | "directory"
  | "hr_documents" | "announcement"
  | "greeting" | "thanks" | "general";

function classify(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/\b(hi|hello|hey|good morning|good afternoon|good evening|howdy)\b/.test(m)) return "greeting";
  if (/\b(thank|thanks|thank you|cheers)\b/.test(m)) return "thanks";
  if (/\b(leave balance|days left|remaining leave|how many leave)\b/.test(m)) return "leave_balance";
  if (/\b(apply leave|request leave|book leave|take leave)\b/.test(m)) return "leave_apply";
  if (/\b(leave policy|leave rules|leave types|casual leave|sick leave)\b/.test(m)) return "leave_policy";
  if (/\b(attendance|check in|check out|present|absent|late)\b/.test(m)) return "attendance_status";
  if (/\b(attendance policy|working hours|shift|office timing)\b/.test(m)) return "attendance_policy";
  if (/\b(salary|payroll|pay|payslip|ctc|net salary|paycheck)\b/.test(m)) return "payroll_info";
  if (/\b(payslip|pay slip|download salary|salary slip)\b/.test(m)) return "payslip";
  if (/\b(ticket|support|issue|problem|complaint|helpdesk)\b/.test(m)) return "ticket_status";
  if (/\b(raise ticket|new ticket|create ticket|submit issue)\b/.test(m)) return "raise_ticket";
  if (/\b(resign|resignation|notice period|quit|last working day)\b/.test(m)) return "resignation";
  if (/\b(exit|exit process|clearance|exit checklist)\b/.test(m)) return "exit_process";
  if (/\b(org chart|organisation|organization|team|department|reporting)\b/.test(m)) return "org_info";
  if (/\b(directory|contact|phone|email.*colleague|find employee)\b/.test(m)) return "directory";
  if (/\b(document|policy|handbook|nda|offer letter|hr doc)\b/.test(m)) return "hr_documents";
  if (/\b(announcement|news|update|notice)\b/.test(m)) return "announcement";
  return "general";
}

// ── Response builder ─────────────────────────────────────────────────────────

interface ChatResponse {
  text: string;
  actions?: { label: string; href: string }[];
  data?: Record<string, unknown>;
}

async function buildResponse(intent: Intent, employeeId: string, employeeName: string): Promise<ChatResponse> {
  const first = employeeName.split(" ")[0];

  switch (intent) {
    case "greeting":
      return {
        text: `Hello ${first}! 👋 I'm your Anvesync HR assistant. I can help you with leave balance, payroll info, attendance, support tickets, and more. What can I help you with today?`,
        actions: [
          { label: "Check leave balance", href: "/dashboard/leave" },
          { label: "View payslip", href: "/dashboard/my-payroll" },
          { label: "Raise a ticket", href: "/dashboard/tickets" },
        ],
      };

    case "thanks":
      return { text: `You're welcome, ${first}! Is there anything else I can help you with?` };

    case "leave_balance": {
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { leaveBalance: true } });
      const balance = emp?.leaveBalance ?? 18;
      const used    = 18 - balance;
      return {
        text: `You currently have **${balance} leave days** remaining out of your 18-day annual entitlement. You've used **${used} days** so far this year.`,
        actions: [{ label: "Apply for leave", href: "/dashboard/leave" }],
        data: { leaveBalance: balance, used, total: 18 },
      };
    }

    case "leave_apply":
      return {
        text: `To apply for leave, head over to the Leave Requests page. You can select your dates, choose a category (casual, sick, earned, or unpaid), add a reason, and submit for approval. Your manager will be notified automatically.`,
        actions: [{ label: "Apply for leave", href: "/dashboard/leave?apply=1" }],
      };

    case "leave_policy":
      return {
        text: `**Anvesana Leave Policy:**\n\n• **Annual entitlement**: 18 days per year\n• **Categories**: Casual, Sick, Earned, Unpaid\n• **Casual Leave**: For personal needs; advance notice preferred\n• **Sick Leave**: Medical reasons; deducted from annual balance\n• **Earned Leave**: Accumulated through service\n• **Unpaid Leave**: Available when balance is exhausted (deducts salary proportionally)\n\nAll requests require manager approval.`,
        actions: [{ label: "View HR Documents", href: "/dashboard/hr-documents" }],
      };

    case "attendance_status": {
      const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
      const now   = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const [todayAtt, monthCount] = await Promise.all([
        prisma.attendance.findFirst({ where: { employeeId, date: today }, select: { checkIn: true, checkOut: true, status: true, hours: true } }),
        prisma.attendance.count({ where: { employeeId, date: { gte: startOfMonth }, checkIn: { not: null } } }),
      ]);
      if (!todayAtt?.checkIn) {
        return {
          text: `You haven't checked in today yet, ${first}. This month you've been present **${monthCount} day(s)** so far.`,
          actions: [{ label: "Check in now", href: "/dashboard" }],
        };
      }
      const checkInTime  = new Date(todayAtt.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const checkOutTime = todayAtt.checkOut ? new Date(todayAtt.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
      return {
        text: `Today you checked in at **${checkInTime}**${checkOutTime ? ` and checked out at **${checkOutTime}**` : " and haven't checked out yet"}. This month you've been present **${monthCount} day(s)**.${todayAtt.hours ? ` Hours worked today: **${todayAtt.hours}h**` : ""}`,
        actions: [{ label: "View attendance history", href: "/dashboard/attendance" }],
      };
    }

    case "attendance_policy":
      return {
        text: `**Attendance Policy:**\n\n• Office hours: Monday – Saturday, 9:30 AM – 6:00 PM\n• Check-in by 9:30 AM to mark as present\n• Check-in between 9:31 – 10:30 AM is marked as late\n• 3 late marks = 1 casual leave deduction\n• Location verification required during check-in`,
      };

    case "payroll_info": {
      const latest = await prisma.payroll.findFirst({
        where: { employeeId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { month: true, year: true, netSalary: true, paymentStatus: true, paidAt: true },
      });
      if (!latest) {
        return { text: `No payroll records found yet, ${first}. Your payslips will appear here once they're generated by HR.`, actions: [{ label: "My Payroll", href: "/dashboard/my-payroll" }] };
      }
      const months = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
      return {
        text: `Your latest payslip is for **${months[latest.month]} ${latest.year}** with a net salary of **₹${latest.netSalary.toLocaleString("en-IN")}**. Status: **${latest.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}**${latest.paidAt ? ` on ${new Date(latest.paidAt).toLocaleDateString("en-IN")}` : ""}.`,
        actions: [{ label: "View all payslips", href: "/dashboard/my-payroll" }],
      };
    }

    case "payslip":
      return {
        text: `You can download your payslips from the My Payroll page. Click on any month to open the payslip, then use the Print / Save PDF button to download it.`,
        actions: [{ label: "My Payroll", href: "/dashboard/my-payroll" }],
      };

    case "ticket_status": {
      const openTickets = await prisma.ticket.count({ where: { createdById: employeeId, status: { in: ["open", "in_progress"] } } });
      return {
        text: openTickets > 0
          ? `You have **${openTickets} open ticket(s)**. You can check the status and replies on the Tickets page.`
          : `You have no open support tickets right now, ${first}. Feel free to raise one if you need help!`,
        actions: [{ label: "View my tickets", href: "/dashboard/tickets" }],
      };
    }

    case "raise_ticket":
      return {
        text: `To raise a support ticket, go to the Tickets page and click "Raise Ticket". Choose the category (HR, Payroll, Leave, IT, or General), set a priority, and describe your issue. Our team will respond shortly.`,
        actions: [{ label: "Raise a ticket", href: "/dashboard/tickets" }],
      };

    case "resignation":
      return {
        text: `To submit your resignation, go to the **Resignation** page. You'll need to:\n\n1. Provide a last working day (must be a future date)\n2. Write a reason\n3. Submit for HR review\n\nHR will then review and begin the exit process including asset clearance and payroll settlement.`,
        actions: [{ label: "Resignation page", href: "/dashboard/resignation" }],
      };

    case "exit_process":
      return {
        text: `The exit process at Anvesana involves:\n\n1. **Resignation submitted** → Admin review\n2. **Manager review** → Acknowledgement\n3. **HR review** → Documentation\n4. **Clearance** → Laptop, ID card, payroll, documents\n5. **Exit interview** → Feedback\n6. **Completion** → Full & final settlement\n\nYou can track your exit status in real-time.`,
        actions: [{ label: "Track exit status", href: "/dashboard/resignation" }],
      };

    case "org_info":
      return {
        text: `You can explore the company structure on the **Org Chart** page. It shows the full reporting hierarchy. You can also visit the **Directory** to find any colleague's contact info.`,
        actions: [
          { label: "Org Chart", href: "/dashboard/org-chart" },
          { label: "Employee Directory", href: "/dashboard/directory" },
        ],
      };

    case "directory":
      return {
        text: `The Employee Directory lists all colleagues with their contact info, department, skills, and reporting manager. You can search by name, skills, or department.`,
        actions: [{ label: "Open Directory", href: "/dashboard/directory" }],
      };

    case "hr_documents":
      return {
        text: `HR documents including the Employee Handbook, leave policy, NDA templates, and tax documents are available in the HR Documents library. You can preview or download any document.`,
        actions: [{ label: "HR Documents", href: "/dashboard/hr-documents" }],
      };

    case "announcement":
      return {
        text: `Latest company announcements are posted on the Announcements page. You also receive bell notifications when a new announcement is made.`,
        actions: [{ label: "View Announcements", href: "/dashboard/announcements" }],
      };

    default:
      return {
        text: `I can help you with:\n\n• 📅 **Leave** — balance, applying, policies\n• ⏰ **Attendance** — status, history, policies\n• 💰 **Payroll** — payslips, salary info\n• 🎫 **Tickets** — raise or check support requests\n• 🏢 **Organisation** — org chart, directory\n• 📄 **Documents** — HR policies, handbooks\n• 🚪 **Exit** — resignation, clearance process\n\nWhat would you like to know?`,
        actions: [
          { label: "My Profile", href: "/dashboard/profile" },
          { label: "Leave Requests", href: "/dashboard/leave" },
        ],
      };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "message is required." }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Message too long." }, { status: 400 });

  const emp = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { fullName: true },
  });

  const intent   = classify(message);
  const response = await buildResponse(intent, payload.id, emp?.fullName ?? "there");

  return NextResponse.json({
    message: response.text,
    actions: response.actions ?? [],
    intent,
    data:    response.data ?? null,
  });
}
