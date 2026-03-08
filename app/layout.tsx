import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Anvesana EMP | Employee Management Platform",
    template: "%s | Anvesana EMP",
  },
  description: "Internal Employee Management Platform for Anvesana Innovation & Entrepreneurial Forum",
  keywords: ["employee management", "HR", "attendance", "leave management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
