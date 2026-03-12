import { NextResponse } from "next/server"
import { getRequestOrigin, originHeaders } from "@/lib/api-origin"

export async function GET(req: Request) {
  const refreshToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Refresh token missing" },
      { status: 401 }
    )
  }

  const origin = getRequestOrigin(req)

  const upstreamRes = await fetch(
    "https://back.bestys.co/api/refresh/token",
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${refreshToken}`,
        ...originHeaders(origin),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
      credentials: "include",
    }
  )

  const data = await upstreamRes.json()

  // 3. Log for debugging (same style as login)
  console.log("REFRESH STATUS:", upstreamRes.status)
  console.log("REFRESH RESPONSE:", data)

  // 4. Return upstream response untouched
  return NextResponse.json(data, { status: upstreamRes.status })
}
