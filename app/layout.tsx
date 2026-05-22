import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Anvesync HRMS",
    template: "%s | Anvesync HRMS",
  },
  description: "Internal Employee Management Platform for Anvesana Innovation & Entrepreneurial Forum",
  keywords: ["employee management", "HR", "attendance", "leave management"],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Anvesync" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
