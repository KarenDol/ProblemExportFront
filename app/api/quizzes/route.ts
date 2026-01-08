import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const product_id = body.product_id
  console.log(product_id)

  // extract token coming from Zustand → fetchQuizzes
  const token = req.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json(
      { message: "Missing Authorization token" },
      { status: 401 }
    )
  }

  const url = "https://api.bestys.co/api/quiz/search"

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",

      // ⭐⭐ The REQUIRED TOKEN ⭐⭐
      "Authorization": `Bearer ${token}`,

      // Other headers
      "Origin": "https://app.eduverse.kz",
      "Referer": "https://app.eduverse.kz/",
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

  const data = await res.json()
  console.log(data)

  return NextResponse.json(data, { status: res.status })
}