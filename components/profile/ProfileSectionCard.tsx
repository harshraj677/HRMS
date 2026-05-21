"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useState } from "react";
import { ReactNode } from "react";

interface ProfileSectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ProfileSectionCard = ({
  title,
  description,
  icon,
  children,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  isLoading = false,
}: ProfileSectionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition">
        <div className="flex items-center gap-3 flex-1" onClick={() => setIsExpanded(!isExpanded)}>
          {icon && <div className="text-slate-600">{icon}</div>}
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSave}
                disabled={isLoading}
                className="h-8 px-3 text-emerald-600 hover:bg-emerald-50"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="h-8 px-3 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          {!isEditing && onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-8 px-3"
            >
              Edit
            </Button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-200 rounded transition"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && <div className="p-6 space-y-4">{children}</div>}
    </Card>
  );
};
