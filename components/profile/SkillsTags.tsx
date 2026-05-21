"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface SkillsTagsProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const SkillsTags = ({
  value,
  onChange,
  placeholder = "Enter a skill and press Enter or comma",
  maxTags = 10,
}: SkillsTagsProps) => {
  const [input, setInput] = useState("");

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  const removeSkill = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(input);
    }
  };

  const handleBlur = () => {
    if (input.trim()) {
      addSkill(input);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tags Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((skill, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1 flex items-center gap-2"
            >
              {skill}
              <button
                onClick={() => removeSkill(index)}
                className="ml-1 hover:text-red-600 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      {value.length < maxTags && (
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
      )}

      {/* Counter */}
      <p className="text-xs text-slate-400">
        {value.length}/{maxTags} skills added
      </p>
    </div>
  );
};
