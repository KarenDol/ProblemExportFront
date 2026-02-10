"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import ExportModal from "@/components/export-modal"

export default function QueuePage() {
  const router = useRouter()
  const {
    file,
    problems,
    addProblem,
    approveProblem,
    approveAllProblems,
    removeProblems,
    clearProblems,
  } = useStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExportOpen, setIsExportOpen] = useState(false)
  const startedRef = useRef(false);

  useEffect(() => {
    if (!file) return;
    if (startedRef.current) return; // prevent double-run in React Strict Mode
    startedRef.current = true;

    fetchProblemsFromFile().catch(console.error);
  }, [file]);

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

  const handleApproveSelected = () => {
    selectedIds.forEach((id) => approveProblem(id))
    setSelectedIds(new Set())
  }

  //Clear Problem and Remove Problem Logic
  const handleRemoveSelected = () => {
    removeProblems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleClearQueue = () => {
    clearProblems()
    setSelectedIds(new Set())
  }

  const fetchProblemsFromFile = async () => {
    const form = new FormData()
    form.append("file", file)

    const res = await fetch("https://upload.a1s.kz/upload", { method: "POST", body: form });
    await streamJsonl(res, (obj) => {
      addProblem(normalizeProblem(obj));
    });
  }

  async function streamJsonl(res: Response, onObj: (o: any) => void) {
    if (!res.body) throw new Error("No response body (streaming not supported).");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const s = line.trim();
        if (!s) continue;
        onObj(JSON.parse(s));
      }
    }

    if (buffer.trim()) onObj(JSON.parse(buffer.trim()));
  }

  function normalizeProblem(raw: any): Problem {
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
    };
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

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSelectAll} size="sm">
            {selectedIds.size === problems.length ? "Deselect All" : "Select All"}
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Button onClick={handleApproveSelected} size="sm">
                Approve Selected ({selectedIds.size})
              </Button>

              <Button variant="destructive" onClick={handleRemoveSelected} size="sm">
                Remove Selected ({selectedIds.size})
              </Button>

              <Button variant="outline" onClick={() => setSelectedIds(new Set())} size="sm">
                Clear Selection
              </Button>
            </>
          )}

          <Button onClick={approveAllProblems} variant="outline" size="sm">
            Approve All
          </Button>

          {problems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearQueue}
              size="sm"
            >
              Clear Queue
            </Button>
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
