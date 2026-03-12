"use client"

import { useMemo, useState } from "react"
import { useStore } from "@/lib/store"
import { getPlatformOriginHeader } from "@/lib/platform"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>("")

  const {
    token,
    problems,
    selectedProduct,
    selectedQuiz,
    selectedSubjectId,
    selectedSubject,
    selectedGrade,
    selectedBrandId,
  } = useStore()

  const approvedProblems = useMemo(
    () => problems.filter((p) => p.approved),
    [problems]
  )

  const close = () => {
    setMessage("")
    onClose()
  }

  const handleExport = async () => {
    if (!token) {
      setMessage("You are not logged in (missing token).")
      return
    }
    if (approvedProblems.length === 0) {
      setMessage("No approved problems to export.")
      return
    }
    if (!selectedProduct || !selectedQuiz || !selectedSubject || !selectedBrandId) {
      setMessage("Please select Product, Quiz, Subject (and brand) before exporting.")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const origin = getPlatformOriginHeader()
      const res = await fetch("/api/export-problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ required for Bestys
          ...(origin ? { "X-Platform-Origin": origin } : {}),
        },
        body: JSON.stringify({
          problems: approvedProblems,
          product: selectedProduct,   
          curriculum: selectedSubject, // curriculumId
          quiz: selectedQuiz,         // quizId
          subject: selectedSubjectId,   // subjectId
          brandId: selectedBrandId,   // brandId
          grade: selectedGrade,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(data?.error ? `Error: ${data.error}` : `Error: Export failed (${res.status})`)
        return
      }

      setMessage(`✓ Exported ${data.exported ?? approvedProblems.length} problem(s).`)

      setTimeout(() => {
        close()
      }, 1500)
    } catch (err) {
      console.error(err)
      setMessage("Failed to export problems (network/server error).")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Export Problems</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              Approved Problems:{" "}
              <span className="font-bold text-primary">{approvedProblems.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              These problems will be sent to Bestys.
            </p>
          </div>

          {message && (
            <div className="rounded bg-secondary/30 p-3 text-sm text-foreground">
              {message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={close}
              variant="outline"
              className="flex-1 bg-transparent"
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              onClick={handleExport}
              className="flex-1"
              disabled={isLoading || approvedProblems.length === 0}
            >
              {isLoading ? "Exporting..." : "Export to API"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
