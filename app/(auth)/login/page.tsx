"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Sparkles,
  Users,
  CalendarCheck,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const features = [
  { icon: Users, title: "Team Management", desc: "Manage your entire workforce from one place" },
  { icon: CalendarCheck, title: "Smart Attendance", desc: "Real-time check-in/check-out tracking" },
  { icon: BarChart3, title: "Insightful Analytics", desc: "Data-driven decisions with powerful reports" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error ?? "Login failed. Please try again.");
        setIsLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      console.error("[login] fetch error:", err);
      setLoginError("Network error. Please check your connection.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:flex">

      {/* ── Left Panel: desktop-only branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative flex items-center gap-3"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-xl overflow-hidden shadow-xl border border-white/20 bg-white">
            <img src="/logo.jpg" alt="AnveCore HRMS Logo" className="w-[120%] h-[120%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div>
            <p className="font-bold text-white text-3xl tracking-wide leading-tight">AnveCore HRMS</p>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Manage your team<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                effortlessly
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              A modern platform for attendance tracking, leave management, and team analytics.
            </p>
          </motion.div>

          <div className="space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{feature.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{feature.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative text-slate-500 text-xs"
        >
          © 2026 AnveCore HRMS — Anvesana Innovation &amp; Entrepreneurial Forum. All rights reserved.
        </motion.p>
      </div>

      {/* ── Right Panel: login form (full-width on mobile) ──────────────── */}
      <div className="flex-1 flex flex-col justify-start lg:justify-center lg:items-center px-6 pt-12 pb-16 lg:p-12 bg-slate-50 lg:bg-white">

        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-3 mb-10 self-start">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden shadow-md border border-slate-100 bg-white">
            <img src="/logo.jpg" alt="AnveCore HRMS Logo" className="w-[120%] h-[120%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-2xl tracking-wide leading-tight">AnveCore HRMS</p>
          </div>
        </div>

        {/* Card — flat on mobile, elevated on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "w-full",
            "lg:max-w-md lg:bg-white lg:rounded-2xl lg:shadow-xl lg:border lg:border-slate-100 lg:p-10"
          )}
        >
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 mt-1.5 text-[15px]">Sign in to your AnveCore HRMS account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="you@anvecore.org"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                className={cn(
                  "h-12 text-base rounded-xl px-4 bg-white border-slate-200",
                  "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-400",
                  "placeholder:text-slate-400 transition-colors",
                  fieldErrors.email && "border-red-400 bg-red-50/60 focus-visible:ring-red-400 focus-visible:border-red-400"
                )}
              />
              <AnimatePresence>
                {fieldErrors.email && (
                  <motion.p
                    key="email-err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-red-500 font-medium"
                  >
                    {fieldErrors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 active:text-indigo-800 min-h-[44px] flex items-center px-1 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={cn(
                    "h-12 text-base rounded-xl px-4 pr-12 bg-white border-slate-200",
                    "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-400",
                    "placeholder:text-slate-400 transition-colors",
                    fieldErrors.password && "border-red-400 bg-red-50/60 focus-visible:ring-red-400 focus-visible:border-red-400"
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 transition-colors rounded-r-xl"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              <AnimatePresence>
                {fieldErrors.password && (
                  <motion.p
                    key="pwd-err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-red-500 font-medium"
                  >
                    {fieldErrors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Global error banner */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  key="login-err"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
                >
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold">!</span>
                  <p className="text-sm text-red-700 leading-snug">{loginError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-14 rounded-2xl font-semibold text-white text-base tracking-wide",
                "bg-gradient-to-r from-indigo-600 to-violet-600",
                "shadow-lg shadow-indigo-500/30",
                "active:scale-[0.98] transition-all duration-150",
                "flex items-center justify-center gap-2.5",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={() => alert("Google SSO is coming soon.")}
            className={cn(
              "w-full h-12 rounded-xl border border-slate-200 bg-white",
              "flex items-center justify-center gap-3",
              "text-sm font-medium text-slate-700",
              "hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98]",
              "transition-all duration-150 shadow-sm"
            )}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8 leading-relaxed">
            © 2026 Anvesana Innovation & Entrepreneurial Forum
          </p>
        </motion.div>
      </div>
    </div>
  );
}
