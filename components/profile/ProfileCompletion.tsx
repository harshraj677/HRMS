"use client";

import { useEffect, useState } from "react";

interface ProfileCompletionProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const ProfileCompletion = ({
  percentage,
  size = 120,
  strokeWidth = 6,
}: ProfileCompletionProps) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayPercentage(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPercentage / 100) * circumference;

  const getColor = (percent: number) => {
    if (percent >= 80) return "url(#gradientGreen)";
    if (percent >= 50) return "url(#gradientYellow)";
    return "url(#gradientRed)";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient
              id="gradientGreen"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient
              id="gradientYellow"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient
              id="gradientRed"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(displayPercentage)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-slate-900">
            {displayPercentage}%
          </p>
          <p className="text-xs text-slate-500 font-medium">Complete</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="text-center">
        {displayPercentage >= 80 && (
          <p className="text-xs font-medium text-emerald-600">
            Profile Complete! 🎉
          </p>
        )}
        {displayPercentage >= 50 && displayPercentage < 80 && (
          <p className="text-xs font-medium text-amber-600">
            Profile {displayPercentage}% Complete
          </p>
        )}
        {displayPercentage < 50 && (
          <p className="text-xs font-medium text-slate-600">
            {100 - displayPercentage}% to complete
          </p>
        )}
      </div>
    </div>
  );
};
