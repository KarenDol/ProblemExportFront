import { NextResponse } from "next/server"
import { getRequestOrigin, originHeaders } from "@/lib/api-origin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { subjectId, brandId } = body
    const origin = getRequestOrigin(req)

    if (!subjectId || !brandId) {
      return NextResponse.json(
        { message: "Missing subjectId or brandId" },
        { status: 400 }
      )
    }

    const rawAuth = req.headers.get("authorization")
    const token = rawAuth?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json(
        { message: "Missing Authorization token" },
        { status: 401 }
      )
    }

    const url =
      `https://back.bestys.co/api/curriculum/search?subjectId=${subjectId}&brandId=${brandId}`

    console.log("BESTYS URL:", url)
    console.log("JWT:", token.substring(0, 20) + "...")

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${token}`,
        ...originHeaders(origin),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
    })

    const data = await res.json()

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("subjects route error:", err)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}