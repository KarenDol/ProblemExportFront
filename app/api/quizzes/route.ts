import { NextResponse } from "next/server"
import { getRequestOrigin, originHeaders } from "@/lib/api-origin"

export async function POST(req: Request) {
  const body = await req.json()
  const product_id = body.product_id
  const origin = getRequestOrigin(req)
  console.log(product_id)

  const token = req.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json(
      { message: "Missing Authorization token" },
      { status: 401 }
    )
  }

  const url = "https://back.bestys.co/api/quiz/search"

  const callUpstream = async (token: string) => {
    return fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...originHeaders(origin),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        grade: "",
        ids: [],
        productId: product_id,
        sandboxId: null,
        subjectId: null,
        type: "",
      }),
    })
  }

  // 1️⃣ First attempt
  let res = await callUpstream(token)

  // 2️⃣ If expired → refresh token → retry once
  if (res.status === 401) {
    console.log("Access token expired → refreshing")
    const refreshHeaders: Record<string, string> = {
      Authorization: req.headers.get("authorization")!,
    }
    if (req.headers.get("x-platform-origin")) {
      refreshHeaders["X-Platform-Origin"] = req.headers.get("x-platform-origin")!
    }
    const refreshRes = await fetch(
      `${req.headers.get("origin") || "http://localhost:3000"}/api/refresh-token`,
      { method: "GET", headers: refreshHeaders }
    )

    if (!refreshRes.ok) {
      return NextResponse.json(
        { message: "Refresh token expired" },
        { status: 401 }
      )
    }

    const refreshed = await refreshRes.json()
    const newAccessToken = refreshed.access_token

    if (!newAccessToken) {
      return NextResponse.json(
        { message: "Failed to refresh token" },
        { status: 401 }
      )
    }

    res = await callUpstream(newAccessToken)
  }

  const data = await res.json()
  console.log("FINAL STATUS:", res.status)
  console.log("FINAL DATA:", data)

  return NextResponse.json(data, { status: res.status })
}