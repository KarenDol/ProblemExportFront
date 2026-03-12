import { NextResponse } from "next/server"
import { getRequestOrigin, originHeaders } from "@/lib/api-origin"

export async function GET(req: Request) {
  const accessToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")

  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  const origin = getRequestOrigin(req)
  const url = "https://back.bestys.co/api/product/search"

  const body = {
    brandId: null,
    isAggregator: false,
    isOwn: true,
    sortDirection: "desc",
    sortKey: "id",
    subjectId: null,
  }

  const callUpstream = async (token: string) => {
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        ...originHeaders(origin),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
    })
  }

  // 1️⃣ first attempt
  let res = await callUpstream(accessToken)

  if (res.status === 401) {
    console.log("Products: token expired → refreshing")
    const refreshHeaders: Record<string, string> = {
      Authorization: req.headers.get("authorization")!,
    }
    if (req.headers.get("x-platform-origin")) {
      refreshHeaders["X-Platform-Origin"] = req.headers.get("x-platform-origin")!
    }
    const refreshRes = await fetch(
      `${req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "http://localhost:3000"}/api/refresh-token`,
      { method: "GET", headers: refreshHeaders }
    )

    if (!refreshRes.ok) {
      return new Response("Refresh token expired", { status: 401 })
    }

    const refreshed = await refreshRes.json()
    const newAccessToken = refreshed.access_token

    if (!newAccessToken) {
      return new Response("Failed to refresh token", { status: 401 })
    }

    // 🔁 retry once
    res = await callUpstream(newAccessToken)
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
