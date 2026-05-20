import { Resend } from "resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://anvesync.vercel.app";

export interface EmailResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] ❌ RESEND_API_KEY is not set. Add it to Vercel Environment Variables.");
    return null;
  }
  return new Resend(key);
}

function getSenderAddress(): string {
  // Use verified domain sender if configured, otherwise fall back to Resend's test sender.
  // NOTE: onboarding@resend.dev can only deliver to the Resend account owner's email.
  // To send to any employee email, set RESEND_FROM_EMAIL=noreply@yourdomain.com after
  // verifying your domain at resend.com/domains.
  const custom = process.env.RESEND_FROM_EMAIL;
  if (custom) {
    console.log(`[email] Using custom sender: ${custom}`);
    return custom;
  }
  console.warn(
    "[email] ⚠ RESEND_FROM_EMAIL not set. Using onboarding@resend.dev — " +
    "this only delivers to the Resend account owner's email. " +
    "Set RESEND_FROM_EMAIL=noreply@yourdomain.com after verifying your domain."
  );
  return "Anvesync <onboarding@resend.dev>";
}

function buildHtml(fullName: string, email: string, password: string, loginUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin-bottom:12px;">
            <span style="color:white;font-size:22px;font-weight:900;letter-spacing:-1px;">A</span>
          </div>
          <h1 style="color:white;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Anvesync</h1>
          <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Anvesana Innovation &amp; Entrepreneurial Forum</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

          <!-- Greeting -->
          <h2 style="color:#0f172a;margin:0 0 8px;font-size:22px;font-weight:700;">Welcome aboard, ${fullName}! 🎉</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Your employee account on the Anvesync Workforce Management Platform has been created.
            Use the credentials below to sign in for the first time.
          </p>

          <!-- Credentials box -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:0 0 24px;">
            <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Your login credentials</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#64748b;font-size:12px;font-weight:600;display:block;margin-bottom:3px;">EMAIL ADDRESS</span>
                  <span style="color:#1e293b;font-family:monospace;font-size:15px;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="color:#64748b;font-size:12px;font-weight:600;display:block;margin-bottom:6px;">TEMPORARY PASSWORD</span>
                  <span style="display:inline-block;background:#0f172a;color:#a5f3fc;font-family:'Courier New',monospace;font-size:18px;font-weight:700;padding:8px 16px;border-radius:8px;letter-spacing:2px;">${password}</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Warning -->
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 28px;display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:16px;line-height:1;">⚠️</span>
            <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
              <strong>This is a one-time temporary password.</strong> You will be prompted to change it on your first login. Do not share this password with anyone.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${loginUrl}"
               style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:-0.01em;">
              Log In to Anvesync →
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
              Or copy this URL: <a href="${loginUrl}" style="color:#6366f1;text-decoration:none;">${loginUrl}</a>
            </p>
          </div>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;" />

          <!-- Footer -->
          <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.7;text-align:center;">
            This is an automated message from <strong>Anvesync</strong>.<br />
            If you did not expect this email, please contact your administrator immediately.
          </p>
        </td></tr>

        <!-- Bottom spacer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2025 Anvesana Innovation &amp; Entrepreneurial Forum. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCredentialsEmail({
  email,
  fullName,
  password,
}: {
  email: string;
  fullName: string;
  password: string;
}): Promise<EmailResult> {
  console.log(`[email] Starting welcome email send → ${email}`);

  const client = getResendClient();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY is not configured on the server.", errorCode: "MISSING_API_KEY" };
  }

  const from = getSenderAddress();
  const loginUrl = `${APP_URL}/login`;

  const html = buildHtml(fullName, email, password, loginUrl);
  const text = [
    `Welcome to Anvesync, ${fullName}!`,
    ``,
    `Your employee account has been created.`,
    `Log in at: ${loginUrl}`,
    ``,
    `Email:             ${email}`,
    `Temporary Password: ${password}`,
    ``,
    `⚠ Change your password immediately after first login.`,
    ``,
    `— Anvesync, Anvesana Innovation & Entrepreneurial Forum`,
  ].join("\n");

  try {
    console.log(`[email] Calling Resend API (from: ${from}, to: ${email})`);
    const { data, error } = await client.emails.send({
      from,
      to: email,
      subject: `Your Anvesync account is ready, ${fullName}!`,
      html,
      text,
    });

    if (error) {
      console.error(`[email] ❌ Resend returned error:`, JSON.stringify(error, null, 2));

      // Detect the sandbox/testing restriction clearly
      const msg: string = (error as any).message ?? String(error);
      if (msg.toLowerCase().includes("testing") || msg.toLowerCase().includes("own email")) {
        const friendlyMsg =
          "Resend test mode: emails can only be sent to the Resend account owner's address. " +
          "Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL=noreply@yourdomain.com to send to any employee.";
        console.error(`[email] ⚠ Sandbox restriction detected: ${friendlyMsg}`);
        return { success: false, error: friendlyMsg, errorCode: "SANDBOX_RESTRICTION" };
      }

      return { success: false, error: msg, errorCode: "RESEND_API_ERROR" };
    }

    console.log(`[email] ✅ Email sent successfully. Resend ID: ${data?.id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] ❌ Unexpected exception:`, msg);
    return { success: false, error: msg, errorCode: "UNEXPECTED_ERROR" };
  }
}
