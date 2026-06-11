import { cn } from "@/lib/utils";

function colorForProgress(progress: number) {
  if (progress >= 100) return "stroke-emerald-500";
  if (progress >= 50) return "stroke-sky-500";
  if (progress > 0) return "stroke-amber-500";
  return "stroke-slate-300";
}

export function ProgressRing({
  progress,
  size = 44,
  strokeWidth = 4,
  className,
  showLabel = true,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", colorForProgress(progress))}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-[10px] font-bold text-slate-700">{progress}%</span>
      )}
    </div>
  );
}
