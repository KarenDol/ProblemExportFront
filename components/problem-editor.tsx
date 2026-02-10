"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore, type Problem, type Answer } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import dynamic from "next/dynamic"
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";

interface ProblemEditorProps {
  problem: Problem
}

const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((m) => m.Editor),
  { ssr: false }
)

export default function ProblemEditor({ problem }: ProblemEditorProps) {
  const router = useRouter()
  const { updateProblem, approveProblem } = useStore()
  const [formData, setFormData] = useState(problem)
  const [isSaving, setIsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [draftPointsCorrect, setDraftPointsCorrect] = useState<number>(
    (formData as any).pointsIfTrue ?? 1
  );
  const [draftPointsIncorrect, setDraftPointsIncorrect] = useState<number>(
    (formData as any).pointsIfFalse ?? 0
  );

  const handleSave = async () => {
    setIsSaving(true)
    updateProblem(problem.id, formData)
    router.push("/queue")
  }

  const handleApprove = () => {
    handleSave()
    setTimeout(() => {
      approveProblem(problem.id)
      router.push("/queue")
    }, 500)
  }

  const updateAnswer = (answerId: string, field: keyof Answer, value: string) => {
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers.map((a) =>
        a.id === answerId ? { ...a, [field]: value } : a
      ),
    }))
  }

  const addAnswer = () => {
    if (formData.answers.length < 4) {
      setFormData({
        ...formData,
        answers: [
          ...formData.answers,
          {
            id: crypto.randomUUID(),
            label: String.fromCharCode(65 + formData.answers.length),
            content: "",
          },
        ],
      })
    }
  }

  const deleteAnswer = (answerId: string) => {
    setFormData({
      ...formData,
      answers: formData.answers.filter((a) => a.id !== answerId),
      correctAnswer:
        formData.correctAnswer === answerId ? "" : formData.correctAnswer,
    })
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="text-right text-sm text-muted-foreground">
        {problem.approved ? "✓ Approved" : "Pending Review"}
      </div>

      {/* Question */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Question</CardTitle>

          <Dialog
            open={settingsOpen}
            onOpenChange={(open) => {
              setSettingsOpen(open);
              if (open) {
                // sync drafts from current formData when opening
                setDraftPointsCorrect((formData as any).pointsIfTrue ?? 1);
                setDraftPointsIncorrect((formData as any).pointsIfFalse ?? 0);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Scoring settings</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="points-correct">Points if correct</Label>
                  <Input
                    id="points-correct"
                    type="number"
                    value={draftPointsCorrect}
                    onChange={(e) => setDraftPointsCorrect(Number(e.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="points-incorrect">Points if incorrect</Label>
                  <Input
                    id="points-incorrect"
                    type="number"
                    value={draftPointsIncorrect}
                    onChange={(e) => setDraftPointsIncorrect(Number(e.target.value))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      pointsIfTrue: draftPointsCorrect,
                      pointsIfFalse: draftPointsIncorrect,
                    }) as any);
                    setSettingsOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Editor
              apiKey="ubxomie1y2fssxynnh3clfhdmv7l9k5ehh2vi8nwqib4vlvt"
              value={formData.content}
              onEditorChange={(html) =>
                setFormData((prev) => ({ ...prev, content: html }))
              }
              init={{
                height: 450,
                menubar: false,
                plugins: [
                  "lists",
                  "link",
                  "table",
                  "code",
                  "superscript",
                  "subscript",
                ],
                toolbar:
                  "undo redo | bold italic underline | superscript subscript | align | numlist bullist | removeformat",
                content_style:
                  "body { font-family: Inter, Arial, sans-serif; font-size: 14px; }",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Answers</CardTitle>
          <Button
            onClick={addAnswer}
            variant="outline"
            size="sm"
            disabled={formData.answers.length >= 4}
          >
            + Add Answer
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {formData.answers.map((answer) => (
            <div
              key={answer.id}
              className="p-4 border rounded-lg space-y-3 bg-secondary/20"
            >
              <div className="grid grid-cols-3 gap-3 items-center">
                {/* Correct */}
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={formData.correctAnswer === answer.id}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        correctAnswer: answer.id,
                      })
                    }
                    className="w-5 h-5"
                  />
                  <span className="ml-2 text-sm">Correct</span>
                </div>

                {/* Label */}
                <Input
                  value={answer.label}
                  onChange={(e) =>
                    updateAnswer(answer.id, "label", e.target.value)
                  }
                />

                {/* Delete */}
                <Button
                  onClick={() => deleteAnswer(answer.id)}
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  Delete
                </Button>
              </div>

              {/* Answer Content */}
              <Editor
                apiKey="ubxomie1y2fssxynnh3clfhdmv7l9k5ehh2vi8nwqib4vlvt"
                value={answer.content}
                onEditorChange={(html) =>
                  updateAnswer(answer.id, "content", html)
                }
                init={{
                  height: 160,
                  menubar: false,
                  plugins: ["superscript", "subscript"],
                  toolbar: "superscript subscript | removeformat",
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Solution */}
      <Card>
        <CardHeader>
          <CardTitle>Solution</CardTitle>
        </CardHeader>
        <CardContent>
           <Editor
              apiKey="ubxomie1y2fssxynnh3clfhdmv7l9k5ehh2vi8nwqib4vlvt"
              value={formData.solution}
              onEditorChange={(html) =>
                setFormData((prev) => ({ ...prev, solution: html }))
              }
              init={{
                height: 450,
                menubar: false,
                plugins: [
                  "lists",
                  "link",
                  "table",
                  "code",
                  "superscript",
                  "subscript",
                ],
                toolbar:
                  "undo redo | bold italic underline | superscript subscript | align | numlist bullist | removeformat",
                content_style:
                  "body { font-family: Inter, Arial, sans-serif; font-size: 14px; }",
              }}
            />
        </CardContent>
      </Card>

      {/* Additional Prompt */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Additional Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.additionalPrompt || ""}
            onChange={(e) =>
              setFormData({ ...formData, additionalPrompt: e.target.value })
            }
            className="min-h-24"
          />
        </CardContent>
      </Card> */}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleSave}>
          Save
        </Button>
        <Button
          className="flex-1"
          disabled={!formData.correctAnswer}
          onClick={handleApprove}
        >
          Approve
        </Button>
      </div>
    </div>
  )
}