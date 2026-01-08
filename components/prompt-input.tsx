"use client"

import { Textarea } from "@/components/ui/textarea"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function PromptInput({ value, onChange, placeholder }: PromptInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Enter additional prompt..."}
      className="min-h-24 resize-none"
    />
  )
}
