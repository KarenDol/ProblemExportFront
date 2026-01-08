"use client"

import { useParams, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import ProblemEditor from "@/components/problem-editor"
import { Button } from "@/components/ui/button"

export default function ProblemPage() {
  const params = useParams()
  const router = useRouter()
  const { problems } = useStore()
  const problem = problems.find((p) => p.id === params.id)

  if (!problem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Problem not found</h1>
          <Button onClick={() => router.push("/queue")}>Back to Queue</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Edit Problem</h1>
          <Button variant="outline" onClick={() => router.push("/queue")}>
            Back to Queue
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ProblemEditor problem={problem} />
      </div>
    </div>
  )
}
