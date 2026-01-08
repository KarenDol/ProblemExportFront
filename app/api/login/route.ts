import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { username, password } = await req.json()

  const inner = { login: username, password }
  const authJson = JSON.stringify(inner)
  const authBase64 = Buffer.from(authJson).toString("base64")

  const body = { auth: authBase64 }

  console.log(`Body: ${body}`)

  const upstreamRes = await fetch(
    "https://api.bestys.co/api/login?timeOffset=540",
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://app.eduverse.kz",
        "Referer": "https://app.eduverse.kz/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  
        // might be required:
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
