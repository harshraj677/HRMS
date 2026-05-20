import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://anvesync.vercel.app";

interface SendCredentialsParams {
  email: string;
  fullName: string;
  password: string;
}

export async function sendCredentialsEmail({
  email,
  fullName,
  password,
}: SendCredentialsParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping welcome email.");
    return { success: false, error: "Email service not configured." };
  }

  const loginUrl = `${APP_URL}/login`;

  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:26px;letter-spacing:-0.5px;">Anvesync</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Workforce Management Platform</p>
      </div>

      <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
        <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px;">Welcome, ${fullName}!</h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
          Your employee account has been created on Anvesync. Use the credentials below to log in.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:0 0 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;width:120px;">Email</td>
              <td style="padding:6px 0;color:#1e293b;font-family:monospace;font-size:15px;">${email}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Password</td>
              <td style="padding:6px 0;">
                <span style="background:#1e293b;color:#a5f3fc;font-family:monospace;font-size:16px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:1px;">${password}</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
          <p style="color:#92400e;margin:0;font-size:13px;">
            ⚠️ This is a temporary password. Please change it immediately after your first login.
          </p>
        </div>

        <a href="${loginUrl}"
           style="display:inline-block;background:#6366f1;color:white;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
          Log In to Anvesync →
        </a>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
        <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
          This is an automated message from Anvesync. If you were not expecting this email, please contact your administrator.
        </p>
      </div>
    </div>
  `;

  const text = [
    `Welcome to Anvesync, ${fullName}!`,
    ``,
    `Your account has been created. Log in at: ${loginUrl}`,
    ``,
    `Email:    ${email}`,
    `Password: ${password}`,
    ``,
    `Please change your password after your first login.`,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: "Anvesync <onboarding@resend.dev>",
      to: email,
      subject: "Your Anvesync account is ready",
      html,
      text,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Unexpected error sending email:", err);
    return { success: false, error: "Unexpected email error." };
  }
}
