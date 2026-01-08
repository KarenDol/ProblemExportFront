import { NextResponse } from "next/server"

export async function GET() {
  const url =
    "https://api.bestys.co/api/widget/active/products?sandboxId=40&timeOffset=540"

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Origin": "https://app.eduverse.kz",
      "Referer": "https://app.eduverse.kz/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}