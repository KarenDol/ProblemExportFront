export async function exportProblemsToAPI(problems: any[], product: string, quiz: string, subject: string) {
  try {
    const response = await fetch("/api/export-problems", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problems,
        product,
        quiz,
        subject,
      }),
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("API export error:", error)
    throw error
  }
}

// Template for your custom API integration
// Replace the URL and headers with your actual third-party API details
export async function sendToThirdPartyBooklet(formattedProblems: any[], bookletId: string) {
  // Example template - customize with your API credentials
  // const response = await fetch('https://your-booklet-api.com/problems/import', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BOOKLET_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     problems: formattedProblems,
  //     bookletId,
  //   }),
  // });
  // return response.json();
}
