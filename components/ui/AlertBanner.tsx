"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  error: {
    wrapper: "bg-red-50/95 border-red-200/70",
    shadow: "shadow-red-100",
    accent: "bg-red-500",
    icon: "bg-red-100 text-red-600",
    title: "text-red-900",
    message: "text-red-600/80",
    dismiss: "text-red-300 hover:text-red-600 hover:bg-red-100/80",
    Icon: AlertCircle,
  },
  warning: {
    wrapper: "bg-amber-50/95 border-amber-200/70",
    shadow: "shadow-amber-100",
    accent: "bg-amber-500",
    icon: "bg-amber-100 text-amber-600",
    title: "text-amber-900",
    message: "text-amber-700/80",
    dismiss: "text-amber-300 hover:text-amber-600 hover:bg-amber-100/80",
    Icon: AlertTriangle,
  },
  success: {
    wrapper: "bg-emerald-50/95 border-emerald-200/70",
    shadow: "shadow-emerald-100",
    accent: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-600",
    title: "text-emerald-900",
    message: "text-emerald-700/80",
    dismiss: "text-emerald-300 hover:text-emerald-600 hover:bg-emerald-100/80",
    Icon: CheckCircle2,
  },
  info: {
    wrapper: "bg-indigo-50/95 border-indigo-200/70",
    shadow: "shadow-indigo-100",
    accent: "bg-indigo-500",
    icon: "bg-indigo-100 text-indigo-600",
    title: "text-indigo-900",
    message: "text-indigo-700/80",
    dismiss: "text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100/80",
    Icon: Info,
  },
} as const;

export interface AlertBannerProps {
  type?: keyof typeof variants;
  title: string;
  message?: string;
  dismissible?: boolean;
  autoDismiss?: number;
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  type = "error",
  title,
  message,
  dismissible = true,
  autoDismiss,
  onDismiss,
  className,
}: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  const v = variants[type];
  const Icon = v.Icon;

  useEffect(() => {
    setVisible(true);
  }, [title, message]);

  useEffect(() => {
    if (!autoDismiss) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismiss);
    return () => clearTimeout(t);
  }, [autoDismiss, onDismiss, title]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative flex items-start gap-3 rounded-2xl border px-3.5 py-3",
            "backdrop-blur-sm w-full max-w-full overflow-hidden",
            "shadow-sm",
            v.wrapper,
            v.shadow,
            className
          )}
        >
          {/* Left accent bar */}
          <div
            className={cn(
              "absolute left-0 top-[10%] bottom-[10%] w-[3px] rounded-r-full",
              v.accent
            )}
          />

          {/* Icon bubble */}
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-xl shrink-0 mt-0.5",
              v.icon
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>

          {/* Text block */}
          <div className="flex-1 min-w-0 pr-1">
            <p className={cn("text-[13px] font-semibold leading-tight tracking-[-0.01em]", v.title)}>
              {title}
            </p>
            {message && (
              <p className={cn("text-[12px] mt-[3px] leading-snug", v.message)}>
                {message}
              </p>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5",
                "transition-colors duration-150",
                v.dismiss
              )}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
