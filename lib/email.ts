import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmployeeEmail(
  employeeEmail: string,
  password: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: employeeEmail,
      subject: "Login Credentials - Anvesync",
      text: [
        "Welcome to Anvesync",
        "",
        `Login Email: ${employeeEmail}`,
        `Password:    ${password}`,
        "",
        "Please login and change your password.",
        "https://anvesync.vercel.app/login",
      ].join("\n"),
    });

    console.log("[email] Sent to:", employeeEmail);
    return true;
  } catch (err) {
    console.error("[email] Failed:", err);
    return false;
  }
}
