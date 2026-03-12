"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import ExportModal from "@/components/export-modal"
import { useSearchParams } from "next/navigation"
import type { Problem } from "@/lib/store"

function QueuePageContent() {
  const router = useRouter()

  const file = useStore((s) => s.file)
  const problems = useStore((s) => s.problems)
  const addProblem = useStore((s) => s.addProblem)
  const disapproveProblem = useStore((s) => s.disapproveProblem)
  const approveProblem = useStore((s) => s.approveProblem)
  const removeProblems = useStore((s) => s.removeProblems)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<"idle" | "extracting" | "parsing" | "done">("idle")

  const searchParams = useSearchParams()
  const shouldFetch = searchParams.get("fetch") === "1"

  const controllerRef = useRef<AbortController | null>(null)

  const lastProgressRef = useRef(0)
  const [isStalled, setIsStalled] = useState(false)

  useEffect(() => {
    if (!isFetching) return
    const t = setInterval(() => {
      setIsStalled(progress === lastProgressRef.current)
    }, 1200)
    return () => clearInterval(t)
  }, [isFetching, progress])

  const runIdRef = useRef(0)

  useEffect(() => {
    if (!shouldFetch || !file) return

    runIdRef.current += 1
    const runId = runIdRef.current

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setIsFetching(true)
    setProgress(0)
    setProgressText("Starting…")
    setError(null)

    ;(async () => {
      try {
        const form = new FormData()
        form.append("file", file)

        const res = await fetch("https://upload.a1s.kz/upload", {
          method: "POST",
          body: form,
          signal: controller.signal,
        })

        if (!res.ok) throw new Error(await res.text())

        await streamJsonl(res, (obj) => {
          if (runId !== runIdRef.current) return

          if (obj?.type === "progress") {
            lastProgressRef.current = obj.percent ?? 0
            setProgress(obj.percent ?? 0)
            setProgressText(`${obj.current}/${obj.total} pages`)
            return
          }

          addProblem(normalizeProblem(obj))
        })

        if (runId !== runIdRef.current) return
        setProgress(100)
        setProgressText("Done")
      } catch (e: any) {
        if (e?.name === "AbortError") return
        if (runId !== runIdRef.current) return
        setError(e?.message ?? "Failed to fetch problems")
      } finally {
        if (runId !== runIdRef.current) return
        setIsFetching(false)
      }
    })()

    return () => controller.abort()
  }, [shouldFetch, file, addProblem])


  async function streamJsonl(res: Response, onObj: (o: any) => void) {
    if (!res.body) throw new Error("No response body")

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let idx
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        onObj(JSON.parse(line))
      }
    }

    if (buffer.trim()) onObj(JSON.parse(buffer.trim()))
  }

  const cancelFetch = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsFetching(false)
    setProgressText("Canceled")
  }



  const handleSelectProblem = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === problems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(problems.map((p) => p.id)))
    }
  }

  const handleDisapproveSelected = () => {
    selectedIds.forEach((id) => disapproveProblem(id))
    setSelectedIds(new Set())
  }

  const handleApproveSelected = () => {
    selectedIds.forEach((id) => approveProblem(id))
    setSelectedIds(new Set())
  }

  //Clear Problem and Remove Problem Logic
  const handleRemoveSelected = () => {
    removeProblems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  function normalizeProblem(raw: any) {
    const answers = (raw.answers ?? []).map((a: any, i: number) => ({
      id: crypto.randomUUID(),
      label: String.fromCharCode(65 + i), // A,B,C,D
      content: a.content ?? "",
    }));

    const correctIndex = (raw.answers ?? []).findIndex((a: any) => a.isTrue === true);

    return {
      id: crypto.randomUUID(),
      title: raw.title ?? "",
      content: raw.content ?? "",
      answers,
      correctAnswer: correctIndex >= 0 ? answers[correctIndex].id : "",
      solution: raw.solution ?? "",
      approved: false,
      pointsIfTrue: 1,
      pointsIfFalse: 0,
    } satisfies Problem
  }

  const approvedCount = problems.filter((p) => p.approved).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Problem Queue</h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{problems.length}</div>
                <div className="text-muted-foreground">Total Problems</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{approvedCount}</div>
                <div className="text-muted-foreground">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{problems.length - approvedCount}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isFetching && (
          <Card className="border-border">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Parsing file…</span>
                <span>{progressText} · {progress}%</span>
              </div>
              <div className={isStalled ? "animate-[wiggle_0.6s_ease-in-out_infinite]" : ""}>
                <Progress value={progress} />
              </div>
              <style jsx>{`
                @keyframes wiggle {
                  0% { transform: translateX(0); }
                  25% { transform: translateX(-2px); }
                  50% { transform: translateX(2px); }
                  75% { transform: translateX(-1px); }
                  100% { transform: translateX(0); }
                }
              `}</style>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={cancelFetch}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-border">
            <CardContent className="pt-6 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSelectAll} size="sm">
            {selectedIds.size === problems.length ? "Deselect All" : "Select All"}
          </Button>

          {selectedIds.size > 0 && (
            <>
            <Button onClick={handleDisapproveSelected} size="sm">
                Diapprove Selected ({selectedIds.size})
              </Button>

              <Button onClick={handleApproveSelected} size="sm">
                Approve Selected ({selectedIds.size})
              </Button>

              <Button variant="destructive" onClick={handleRemoveSelected} size="sm">
                Remove Selected ({selectedIds.size})
              </Button>
            </>
          )}

          <Button
            onClick={() => setIsExportOpen(true)}
            className="ml-auto"
            disabled={approvedCount === 0}
          >
            Export to API ({approvedCount})
          </Button>
        </div>

        {/* Problems list */}
        <div className="space-y-3">
          {problems.map((problem) => (
            <Card key={problem.id} className="border-border cursor-pointer hover:bg-card/80 transition-colors">
              <CardContent className="pt-6 flex items-start gap-4">
                <Checkbox
                  checked={selectedIds.has(problem.id)}
                  onCheckedChange={() => handleSelectProblem(problem.id)}
                  className="mt-1"
                />
                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/problem/${problem.id}`)}>
                  <h3 className="font-semibold text-foreground">{problem.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{problem.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${problem.approved ? "text-green-400" : "text-yellow-400"}`}>
                      {problem.approved ? "Approved" : "Pending"}
                    </div>
                  </div>
                  <Button onClick={() => router.push(`/problem/${problem.id}`)} variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {problems.length === 0 && (
          <Card className="border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">
              No problems got fetched yet. Waiting for the server...
            </CardContent>
          </Card>
        )}
      </div>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  )
}

function QueuePageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Loading…</div>
    </div>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={<QueuePageFallback />}>
      <QueuePageContent />
    </Suspense>
  )
}
