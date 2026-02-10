"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProductSelector from "@/components/product-selector"
import PdfUploader from "@/components/pdf-uploader"
import PromptInput from "@/components/prompt-input"

export default function DashboardPage() {
  const router = useRouter()

  const {
    logout,
    selectedProduct,
    selectedQuiz,
    selectedSubject,
    products,
    quizzes,
    subjects,
    file,        
    fetchProducts,
    fetchQuizzes,
    setFile, 
    clearFile
  } = useStore()  

  const [additionalPrompt, setAdditionalPrompt] = useState("")

  // 1) Load products on mount
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // 2) When product changes → load quizzes for that product
  useEffect(() => {
    if (selectedProduct) {
      fetchQuizzes(selectedProduct)
    }
  }, [selectedProduct, fetchQuizzes])

  const canProceed =
    selectedProduct && selectedQuiz && selectedSubject && file

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


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Problem Upload Manager
          </h1>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/queue")}
            >
              Go to Queue
            </Button>

            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>


      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Selection section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductSelector label="Product" options={products} />
          <ProductSelector label="Quiz" options={quizzes} />
          <ProductSelector label="Subject" options={subjects} />
        </div>

        {/* Upload section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PdfUploader />
          </CardContent>
        </Card>

        {/* Additional prompt */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Additional AI Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptInput
              value={additionalPrompt}
              onChange={setAdditionalPrompt}
              placeholder="Add any additional instructions for AI analysis..."
            />
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => router.push("/queue?fetch=1")}
            disabled={!canProceed}
            className="flex-1"
            size="lg"
          >
            Fetch Problems
          </Button>
        </div>
      </div>
    </div>
  )
}