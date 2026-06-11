import nodemailer from "nodemailer";

// ── Centralised branding ──────────────────────────────────────────────────────
const APP_NAME = process.env.APP_NAME || "AnveCore HRMS";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || "https://anvecore.vercel.app";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// ── HTML template ─────────────────────────────────────────────────────────────

function buildEmailHtml(email: string, password: string): string {
  const loginUrl = `${APP_URL}/login`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:14px;padding:10px 22px;">
                      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;letter-spacing:0.5px;">
                      ANVESANA INNOVATION &amp; ENTREPRENEURIAL FORUM
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WELCOME BADGE -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 0;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background:#ede9fe;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">
                      New Employee Onboarding
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:20px;">
                    <h1 style="color:#0f172a;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.5px;">
                      Welcome to the team! 👋
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;padding-bottom:28px;">
                    <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0;max-width:420px;">
                      An account has been created for you on <strong style="color:#6366f1;">${APP_NAME}</strong>.
                      Use the credentials below to sign in and complete your onboarding.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" />
            </td>
          </tr>

          <!-- CREDENTIALS BOX -->
          <tr>
            <td style="background:#ffffff;padding:28px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">
                Your Login Credentials
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:18px 20px;border-bottom:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 5px;">Email Address</p>
                    <p style="color:#1e293b;font-size:15px;font-weight:600;font-family:'Courier New',monospace;margin:0;">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">Temporary Password</p>
                    <span style="display:inline-block;background:#1e293b;color:#a5f3fc;font-family:'Courier New',monospace;font-size:20px;font-weight:700;padding:8px 16px;border-radius:8px;letter-spacing:3px;">${password}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LOGIN BUTTON -->
          <tr>
            <td style="background:#ffffff;padding:4px 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">
              <a href="${loginUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:12px;letter-spacing:-0.2px;">
                Complete Your Onboarding &rarr;
              </a>
              <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
                ${loginUrl}
              </p>
            </td>
          </tr>

          <!-- WHAT HAPPENS NEXT -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #e0e7ff;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">
                      What happens next
                    </p>
                    <p style="color:#3730a3;font-size:13px;margin:0 0 6px;line-height:1.6;">
                      1. Log in with the credentials above.
                    </p>
                    <p style="color:#3730a3;font-size:13px;margin:0 0 6px;line-height:1.6;">
                      2. You'll be guided through a short profile setup.
                    </p>
                    <p style="color:#3730a3;font-size:13px;margin:0;line-height:1.6;">
                      3. An admin will review and approve your profile.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SECURITY NOTE -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:10px;font-size:16px;line-height:1;">⚠️</td>
                        <td>
                          <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
                            <strong>Security Notice:</strong> This is a one-time temporary password.
                            You will be prompted to change it on your first login.
                            Never share your password with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" />
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;border-radius:0 0 16px 16px;text-align:center;">
              <p style="color:#475569;font-size:13px;margin:0 0 4px;">
                Regards, <strong style="color:#6366f1;">${APP_NAME} HR Team</strong>
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                This is an automated message. Please do not reply to this email.<br/>
                If you did not expect this, contact your administrator immediately.
              </p>
            </td>
          </tr>

          <!-- BOTTOM NOTE -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="color:#cbd5e1;font-size:11px;margin:0;">
                &copy; 2025 Anvesana Innovation &amp; Entrepreneurial Forum &mdash; ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Plain-text fallback ───────────────────────────────────────────────────────

function buildEmailText(email: string, password: string): string {
  const loginUrl = `${APP_URL}/login`;
  return [
    `Welcome to ${APP_NAME}!`,
    ``,
    `An account has been created for you on ${APP_NAME}.`,
    ``,
    `LOGIN CREDENTIALS`,
    `─────────────────`,
    `Email:    ${email}`,
    `Password: ${password}`,
    ``,
    `Complete your onboarding here: ${loginUrl}`,
    ``,
    `WHAT HAPPENS NEXT`,
    `1. Log in with the credentials above.`,
    `2. You'll be guided through a short profile setup.`,
    `3. An admin will review and approve your profile.`,
    ``,
    `⚠ Security Notice: This is a temporary password.`,
    `You will be prompted to change it on your first login.`,
    ``,
    `Regards,`,
    `${APP_NAME} HR Team`,
    `Anvesana Innovation & Entrepreneurial Forum`,
  ].join("\n");
}

// ── Exported types & functions ────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  error?: string;
}

export async function sendOnboardingInviteEmail(
  employeeEmail: string,
  password: string,
  role: string
): Promise<EmailResult> {
  const from = process.env.SMTP_FROM || `"${APP_NAME} HR Team" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`;
  try {
    await transporter.sendMail({
      from,
      to:      employeeEmail,
      subject: `Welcome to ${APP_NAME} – Complete Your Onboarding`,
      html:    buildEmailHtml(employeeEmail, password),
      text:    buildEmailText(employeeEmail, password),
    });

    console.log(`✅ Onboarding invite email sent to ${employeeEmail} (role: ${role})`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send onboarding invite email to ${employeeEmail}:`, msg);
    return { success: false, error: msg };
  }
}
