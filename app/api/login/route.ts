import { NextResponse } from "next/server"
import { getRequestOrigin, originHeaders } from "@/lib/api-origin"

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const origin = getRequestOrigin(req)

  const inner = { login: username, password }
  const authJson = JSON.stringify(inner)
  const authBase64 = Buffer.from(authJson).toString("base64")

  const body = { auth: authBase64 }

  console.log(`Body: ${body}`)

  const upstreamRes = await fetch(
    "https://back.bestys.co/api/login?timeOffset=540",
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        ...originHeaders(origin),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
      },
      body: JSON.stringify({ auth: authBase64 }),
      credentials: "include",
    }
  )  

  const data = await upstreamRes.json()

  // 👉 Log everything
  console.log("STATUS:", upstreamRes.status)
  console.log("RAW RESPONSE:", data)

  return NextResponse.json(data, { status: upstreamRes.status })
}
