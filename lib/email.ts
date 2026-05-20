import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmployeeEmail(email: string, password: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Login Credentials - Anvesync",
      text: `Login Email: ${email}\nPassword: ${password}\n\nPlease login and change your password.\n\nhttps://anvesync.vercel.app/login`,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return false;
    }

    console.log("[email] Sent successfully to:", email);
    return true;
  } catch (err) {
    console.error("[email] Error:", err);
    return false;
  }
}
