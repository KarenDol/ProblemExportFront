"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore, type Problem, type Answer } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { v4 as uuidv4 } from "crypto"

interface ProblemEditorProps {
  problem: Problem
}

import dynamic from "next/dynamic";
const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((m) => m.Editor),
  { ssr: false }
);

export default function ProblemEditor({ problem }: ProblemEditorProps) {
  const router = useRouter()
  const { updateProblem, approveProblem } = useStore()
  const [formData, setFormData] = useState(problem)
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSave = async () => {
    updateProblem(problem.id, formData)
    router.push("/queue")
  };

  const handleApprove = () => {
    handleSave()
    setTimeout(() => {
      approveProblem(problem.id)
      router.push("/queue")
    }, 600)
  }

  const updateAnswer = (answerId: string, field: keyof Answer, value: string) => {
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers.map((a) => (a.id === answerId ? { ...a, [field]: value } : a)),
    }));
  };

  const addAnswer = () => {
    if (formData.answers.length < 4) {
      setFormData({
        ...formData,
        answers: [
          ...formData.answers,
          { id: uuidv4(), label: String.fromCharCode(65 + formData.answers.length), content: "" },
        ],
      })
    }
  }

  const deleteAnswer = (answerId: string) => {
    setFormData({
      ...formData,
      answers: formData.answers.filter((a) => a.id !== answerId),
      correctAnswer: formData.correctAnswer === answerId ? "" : formData.correctAnswer,
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="text-right text-sm text-muted-foreground">
        {problem.approved ? "✓ Approved" : "Pending Review"}
      </div>

      {/* Question Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Content</label>
            {/* <Textarea
              value={formData.content}
              className="mt-2 min-h-32 resize-none"
            /> */}
            <Editor
              apiKey='ubxomie1y2fssxynnh3clfhdmv7l9k5ehh2vi8nwqib4vlvt'
              init={{
                height: 450,
                plugins: [
                  // Core editing features
                  'anchor', 'autolink', 'charmap', 'codesample', 'link', 'lists', 'table', 'visualblocks', 'wordcount',
                  // Your account includes a free trial of TinyMCE premium features
                  // Try the most popular premium features until Jan 22, 2026:
                  'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'uploadcare', 'tableofcontents', 'footnotes', 'mergetags', 'inlinecss', 'markdown','importword', 'exportword', 'exportpdf'
                ],
                toolbar: 'undo redo | blocks fontsize | bold italic underline strikethrough | link media table mergetags | align lineheight | checklist numlist bullist indent outdent | removeformat',
                uploadcare_public_key: 'c0eb39067a36cc090af3',
              }}
              value={formData.content}
              onEditorChange={(html) =>
                setFormData((prev) => ({ ...prev, content: html }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Answers Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Answers</CardTitle>
            <Button onClick={addAnswer} variant="outline" size="sm" disabled={formData.answers.length >= 4}>
              + Add Answer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.answers.map((answer) => (
              <div key={answer.id} className="p-4 border border-border rounded-lg space-y-3 bg-secondary/20">
                <div className="grid grid-cols-3 gap-3 items-start">
                  {/* Correct Answer Radio */}
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={formData.correctAnswer === answer.id}
                      onChange={() => setFormData({ ...formData, correctAnswer: answer.id })}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">Correct</span>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Label</label>
                    <Input
                      value={answer.label}
                      onChange={(e) => updateAnswer(answer.id, "label", e.target.value)}
                      placeholder="A, B, C, D"
                      className="text-sm"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => deleteAnswer(answer.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Content</label>
                  {/* <Textarea
                    value={answer.content}
                    onChange={(e) => }
                    className="text-sm min-h-20 resize-none"
                  /> */}
                  <Editor
                    apiKey='ubxomie1y2fssxynnh3clfhdmv7l9k5ehh2vi8nwqib4vlvt'
                    init={{
                      height: 150,
                      menubar: false,
                    }}
                    value={answer.content}
                    onEditorChange={(html) => updateAnswer(answer.id, "content", html)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Solution Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Solution</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.solution}
            onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
            className="min-h-32 resize-none"
          />
        </CardContent>
      </Card>

      {/* Additional Prompt Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Additional Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.additionalPrompt || ""}
            onChange={(e) => setFormData({ ...formData, additionalPrompt: e.target.value })}
            placeholder="Add any special instructions for this problem..."
            className="min-h-24 resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={isSaving} variant="outline" className="flex-1 bg-transparent">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          onClick={handleApprove}
          disabled={isSaving || !formData.correctAnswer || formData.answers.length === 0}
          className="flex-1"
        >
          {problem.approved ? "Already Approved" : "Approve & Submit"}
        </Button>
      </div>
    </div>
  )
}
