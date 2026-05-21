"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X, Check } from "lucide-react";

interface FieldProps {
  label: string;
  value: string | number | undefined;
  type?: "text" | "email" | "tel" | "date" | "number";
  editable?: boolean;
  onSave?: (value: string | number) => void;
  required?: boolean;
}

export const Field = ({
  label,
  value,
  type = "text",
  editable = false,
  onSave,
  required = false,
}: FieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ""));

  const handleSave = () => {
    if (required && !editValue.trim()) return;
    onSave?.(editValue);
    setIsEditing(false);
  };

  if (isEditing && editable) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">{label}</Label>
        <div className="flex gap-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-8 px-2"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="h-8 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-1 cursor-pointer group"
      onClick={() => editable && setIsEditing(true)}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">
        {value || "–"}
      </p>
    </div>
  );
};

interface FieldGridProps {
  fields: FieldProps[];
  columns?: 1 | 2 | 3 | 4;
}

export const FieldGrid = ({ fields, columns = 2 }: FieldGridProps) => {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${colClass[columns]} gap-6`}>
      {fields.map((field, i) => (
        <Field key={i} {...field} />
      ))}
    </div>
  );
};
