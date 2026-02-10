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
  additionalPrompt?: string,
  pointsIfTrue: number,
  pointsIfFalse: number,
}

type ExportRequestBody = {
  problems: IncomingProblem[]
  product: string
  curriculum: string
  quiz: string
  subject: string
  brandId: string
  grade?: number
  difficulty?: "easy" | "medium" | "hard",
  pointsIfTrue: number,
  pointsIfFalse: number,
}

function toInt(x: unknown, fallback = 0) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 })
    }

    let accessToken = authHeader // we will mutate this after refresh

    const body = (await request.json()) as ExportRequestBody
    const {
      problems = [],
      product,
      curriculum,
      quiz,
      subject,
      brandId,
      grade,
      difficulty = "easy",
      pointsIfTrue,
      pointsIfFalse,
    } = body

    const approved = problems.filter((p) => p.approved)
    if (!approved.length) {
      return NextResponse.json(
        { error: "No approved problems to export" },
        { status: 400 }
      )
    }

    const curriculumId = toInt(curriculum)
    const quizId = toInt(quiz)
    const subjectId = toInt(subject)
    const resolvedBrandId = toInt(brandId)

    const results: any[] = []

    // 🔁 SEQUENTIAL upload
    for (let idx = 0; idx < approved.length; idx++) {
      const p = approved[idx]

      const answers = (p.answers ?? []).slice(0, 4).map((a) => ({
        id: 0,
        content: a.content ?? "",
        isTrue: a.id === p.correctAnswer,
        label: a.label ?? "",
        pos: 0,
      }))

      while (answers.length < 4) {
        const label = String.fromCharCode(65 + answers.length)
        answers.push({ id: 0, content: "", isTrue: false, label, pos: 0 })
      }

      const payload = {
        id: 0,
        title: p.title?.trim() || `Problem ${idx + 1}`,
        type: "multiple_choice",
        answers,
        content: p.content ?? "",
        curriculumId,
        quizId,
        subjectId,
        brandId: resolvedBrandId,
        grade,
        difficulty,
        solution: p.solution ?? "",
        status: "review",
        additionalPrompt: p.additionalPrompt ?? "",
        pointsIfTrue: p.pointsIfTrue ?? pointsIfTrue ?? 1,
        pointsIfFalse: p.pointsIfFalse ?? pointsIfFalse ?? 0,
      }

      console.log(payload)

      const send = async (token: string) =>
        fetch(BESTYS_URL, {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        })

      let res = await send(accessToken)

      // 🔁 refresh on 401
      if (res.status === 401) {
        console.log(`Problem ${idx + 1}: token expired → refreshing`)

        const refreshRes = await fetch(
          `${request.headers.get("origin")}/api/refresh-token`,
          {
            method: "GET",
            headers: { Authorization: accessToken },
          }
        )

        if (!refreshRes.ok) {
          results.push({
            ok: false,
            title: payload.title,
            status: 401,
            error: "Refresh token expired",
          })
          break // STOP export — auth is dead
        }

        const refreshed = await refreshRes.json()
        accessToken = `Bearer ${refreshed.access_token}`

        // retry once
        res = await send(accessToken)
      }

      const json = await res.json()

      console.log("Super data:\n", JSON.stringify(json, null, 2))

      results.push({
        ok: res.ok,
        status: res.status,
        title: payload.title,
        response: json,
      })

      // 🧠 small delay (optional but VERY effective)
      await new Promise((r) => setTimeout(r, 120))
    }

    const okCount = results.filter((x) => x.ok).length
    const failed = results.filter((x) => !x.ok)

    return NextResponse.json({
      success: failed.length === 0,
      exported: okCount,
      failed: failed.length,
      failures: failed.slice(0, 5),
    })
  } catch (err) {
    console.error("Export error:", err)
    return NextResponse.json(
      { error: "Failed to export problems" },
      { status: 500 }
    )
  }
}