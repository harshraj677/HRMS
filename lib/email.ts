import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendCredentialsParams {
  email: string;
  fullName: string;
  password: string;
  loginUrl?: string;
}

/**
 * Send employee login credentials via email.
 */
export async function sendCredentialsEmail({
  email,
  fullName,
  password,
  loginUrl,
}: SendCredentialsParams): Promise<void> {
  const appUrl = loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Anvesana</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Innovation &amp; Entrepreneurial Forum</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1e293b; margin: 0 0 16px;">Your Anvesana Employee Account</h2>
        <p style="color: #475569; line-height: 1.6;">Hello <strong>${fullName}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">Your employee account has been created on the Anvesana Workforce Management Platform. Here are your login credentials:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Email:</strong></p>
          <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-family: monospace;">${email}</p>
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Temporary Password:</strong></p>
          <p style="margin: 0; color: #1e293b; font-size: 16px; font-family: monospace;">${password}</p>
        </div>
        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin: 16px 0;">
          <p style="color: #92400e; margin: 0; font-size: 13px;">⚠️ Please change your password after your first login for security.</p>
        </div>
        <a href="${appUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 16px;">Login Now</a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated email from Anvesana Workforce Management Platform. If you did not expect this, please contact your administrator.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Anvesana HR" <${process.env.SMTP_USER || "noreply@anvesana.org"}>`,
      to: email,
      subject: "Your Anvesana Employee Account",
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send credentials email:", error);
    // Don't throw — employee creation should succeed even if email fails
  }
}
