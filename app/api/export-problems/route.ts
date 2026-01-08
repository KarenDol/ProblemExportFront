import { NextRequest, NextResponse } from "next/server"

const BESTYS_URL = "https://api.bestys.co/api/question/add"

type IncomingAnswer = { id: string; label: string; content: string }
type IncomingProblem = {
  id: string
  title: string
  content: string
  answers: IncomingAnswer[]
  correctAnswer: string
  solution?: string
  approved: boolean
  additionalPrompt?: string
}

type ExportRequestBody = {
  problems: IncomingProblem[]
  // your selections from UI (strings, but contain numeric IDs)
  product: string // curriculumId
  quiz: string // quizId
  subject: string // subjectId
  brandId: string // brandId (get it from selected quiz)
  grade?: number
  difficulty?: "easy" | "medium" | "hard"
}

function toInt(x: unknown, fallback = 0) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 })
    }

    const body = (await request.json()) as ExportRequestBody
    const {
      problems = [],
      product,
      quiz,
      subject,
      brandId,
      grade = 9,
      difficulty = "easy",
    } = body

    const approved = problems.filter((p) => p.approved)
    if (approved.length === 0) {
      return NextResponse.json({ error: "No approved problems to export" }, { status: 400 })
    }

    // Map UI selections -> Bestys required IDs
    const curriculumId = toInt(product)
    const quizId = toInt(quiz)
    const subjectId = toInt(subject)
    const resolvedBrandId = toInt(brandId)

    const results = await Promise.all(
      approved.map(async (p, idx) => {
        // Build Bestys answers with isTrue (based on your correctAnswer = answer.id)
        const answers = (p.answers ?? []).slice(0, 4).map((a) => ({
          id: 0,
          content: a.content ?? "",
          isTrue: a.id === p.correctAnswer,
          label: a.label ?? "",
          pos: 0,
        }))

        // Optional: enforce exactly 4 answers like your python
        while (answers.length < 4) {
          const label = String.fromCharCode(65 + answers.length) // A,B,C,D
          answers.push({ id: 0, content: "", isTrue: false, label, pos: 0 })
        }

        const payload = {
          id: 0,
          title: p.title?.trim() || `Problem ${idx + 1}`,
          type: "multiple_choice",
          langs: [],
          answers,

          approvedAt: "",
          author: "",
          brand: "",
          brandId: resolvedBrandId,
          concepts: [],
          content: p.content ?? "",
          conversationId: null,
          createdAt: "",
          curriculumId,
          difficulty,
          fillBlankAnswers: null,
          grade,

          participantAnswerId: 0,
          points: 0,
          pointsIfFalse: 0,
          pointsIfTrue: 1,

          quizId,
          quizQuestionId: null,
          quizQuestionStatus: null,
          quizQuestionStatusReason: null,
          sandboxId: null,

          solution: p.solution ?? "",
          status: "review",
          subjectId,

          // extra info if you want (Bestys might ignore unknown fields)
          additionalPrompt: p.additionalPrompt ?? "",
        }

        const r = await fetch(BESTYS_URL, {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        })

        // Bestys returns JSON; keep text for debugging if it isn't JSON
        const text = await r.text()
        let json: any = null
        try {
          json = JSON.parse(text)
          console.log(json)
        } catch {}

        return {
          ok: r.ok,
          status: r.status,
          title: payload.title,
          response: json ?? text,
        }
      })
    )

    const okCount = results.filter((x) => x.ok).length
    const failed = results.filter((x) => !x.ok)

    return NextResponse.json({
      success: failed.length === 0,
      exported: okCount,
      failed: failed.length,
      failures: failed.slice(0, 5), // limit noise
      results, // remove if too verbose
    })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json({ error: "Failed to export problems" }, { status: 500 })
  }
}