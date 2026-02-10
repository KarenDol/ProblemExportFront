import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // 1. Extract refresh token from Authorization header
  const refreshToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Refresh token missing" },
      { status: 401 }
    )
  }

  // 2. Forward refresh token to upstream API
  const upstreamRes = await fetch(
    "https://api.bestys.co/api/refresh/token",
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${refreshToken}`,
        "Origin": "https://app.eduverse.kz",
        "Referer": "https://app.eduverse.kz/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",

        // same cross-site headers style
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
