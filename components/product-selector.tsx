"use client"

import { useStore } from "@/lib/store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SelectorOption {
  id: number | string
  title: string
}

interface ProductSelectorProps {
  label: string
  options?: SelectorOption[]   // 👈 optional + object-based
}

export default function ProductSelector({ label, options = [] }: ProductSelectorProps) {
  const store = useStore()

  const key = label.toLowerCase() as "product" | "quiz" | "subject"

  const value =
    key === "product"
      ? store.selectedProduct
      : key === "quiz"
      ? store.selectedQuiz
      : store.selectedSubject

  const setter =
    key === "product"
      ? store.setSelectedProduct
      : key === "quiz"
      ? store.setSelectedQuiz
      : store.setSelectedSubject

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      <Select value={value} onValueChange={setter}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
