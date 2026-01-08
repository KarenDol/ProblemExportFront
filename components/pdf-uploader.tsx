"use client"

import type React from "react"
import { useState } from "react"
import { useStore } from "@/lib/store"

export default function PdfUploader() {
  const [isLoading, setIsLoading] = useState(false)
  const { file, setFile } = useStore()

  const pickFile = (f?: File) => {
    // only allow pdf/xlsx (since drop can bypass accept)
    if (!f) {
      setFile(null)
      return
    }
    const ok =
      f.type === "application/pdf" ||
      f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      f.name.toLowerCase().endsWith(".pdf") ||
      f.name.toLowerCase().endsWith(".xlsx")

    if (!ok) {
      alert("Please upload a PDF or .xlsx file.")
      setFile(null)
      return
    }

    setFile(f)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    pickFile(f)
    // allow selecting the same file again to re-trigger onChange
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (isLoading) return
    const f = e.dataTransfer.files?.[0]
    pickFile(f)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors"
      >
        <input
          type="file"
          accept=".pdf,.xlsx"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
          disabled={isLoading}
        />

        {/* Make the label fill the whole box so any click opens dialog */}
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="text-primary text-4xl mb-2">📄</div>
          <p className="text-foreground font-medium">
            {isLoading ? "Processing..." : "Click to upload PDF or Excel"}
          </p>
          <p className="text-muted-foreground text-sm">…or drag and drop a file here</p>

          {file && (
            <p className="mt-3 text-sm text-foreground">
              Selected: <span className="font-semibold">{file.name}</span>
            </p>
          )}
        </label>
      </div>
    </div>
  )
}