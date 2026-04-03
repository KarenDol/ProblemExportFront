import { create } from "zustand"
import { getPlatformOriginHeader, clearStoredPlatform } from "./platform"

export type Id = string | number

export interface Answer {
  id: string
  label: string
  content: string
}

export interface Problem {
  id: string
  title: string
  content: string
  answers: Answer[]
  correctAnswer: string
  solution: string
  approved: boolean
  additionalPrompt?: string
  pointsIfTrue: number,
  pointsIfFalse: number,
}

type Option = { id: Id; title: string }

type QuizOption = Option & {
  subjectId: Id
  brandId: Id
  grade: number
  /** Display name from quiz/search (e.g. "Mathematics") */
  subject?: string
}

const assertAuth = async (res: Response) => {
  if (res.status === 401 || res.status === 403) {
    throw new Error("AUTH_INVALID")
  }
}

interface StoreState {
  // Auth
  isLoggedIn: boolean
  token: string | null
  userEmail: string
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void

  // Products / Quizzes
  products: Option[]
  quizzes: QuizOption[]

  fetchProducts: () => Promise<void>
  fetchQuizzes: (productId: string) => Promise<void>

  selectedProduct: string
  selectedQuiz: string

  /** Subject id from the selected quiz (Bestys subjectId) */
  selectedSubjectId: string
  /** First curriculum for quiz subject+brand (Bestys curriculumId); loaded when quiz is chosen */
  selectedCurriculumId: string
  isLoadingCurriculum: boolean
  curriculumRequestId: number

  selectedBrandId: string
  selectedGrade: number

  setSelectedProduct: (id: string) => void
  setSelectedQuiz: (id: string) => void
  setSelectedGrade: (grade: number) => void

  // File (ephemeral)
  file: File | null
  setFile: (file: File | null) => void
  clearFile: () => void

  // Problems
  problems: Problem[]
  addProblem: (problem: Problem) => void
  updateProblem: (id: string, updates: Partial<Problem>) => void
  disapproveProblem: (id: string) => void
  approveProblem: (id: string) => void
  removeProblems: (ids: string[]) => void

  // UI
  currentProblemId: string | null
  setCurrentProblemId: (id: string | null) => void
}

// ---------- small helpers ----------
const isBrowser = typeof window !== "undefined"

const storage = {
  get(key: string, fallback = ""): string {
    if (!isBrowser) return fallback
    return localStorage.getItem(key) ?? fallback
  },
  set(key: string, value: string) {
    if (!isBrowser) return
    localStorage.setItem(key, value)
  },
  remove(key: string) {
    if (!isBrowser) return
    localStorage.removeItem(key)
  },
}

const loadProblems = (): Problem[] => {
  if (!isBrowser) return []
  try {
    return JSON.parse(localStorage.getItem("problems") || "[]")
  } catch {
    return []
  }
}

const saveProblems = (problems: Problem[]) => {
  storage.set("problems", JSON.stringify(problems))
}

// ---------- store ----------
export const useStore = create<StoreState>((set, get) => ({
  // ========================
  // AUTH
  // ========================
  isLoggedIn: !!storage.get("token", ""),
  token: storage.get("token", "") || null,
  userEmail: storage.get("userEmail", ""),

  login: async (username, password) => {
    try {
      const origin = getPlatformOriginHeader()
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(origin ? { "X-Platform-Origin": origin } : {}),
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok || !data?.access) {
        console.error("Login failed:", data)
        return false
      }

      const token = data.access as string
      storage.set("token", token)
      storage.set("userEmail", username)

      set({ isLoggedIn: true, token, userEmail: username })
      return true
    } catch (err) {
      console.error("Login error:", err)
      return false
    }
  },

  logout: () => {
    storage.remove("token")
    storage.remove("userEmail")
    clearStoredPlatform()

    set({
      isLoggedIn: false,
      token: null,
      userEmail: "",
    })
  },

  // ========================
  // PRODUCTS / QUIZZES
  // ========================
  products: [],
  quizzes: [],

  fetchProducts: async () => {
    const token = get().token
    if (!token) throw new Error("NO_TOKEN")
    const origin = getPlatformOriginHeader()

    const res = await fetch("/api/products", {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(origin ? { "X-Platform-Origin": origin } : {}),
      },
    })

    await assertAuth(res)

    if (!res.ok) {
      throw new Error(await res.text())
    }

    const data = await res.json()
    set({
      products: data.map((p: any) => ({ id: p.id, title: p.title })),
    })
  },

  fetchQuizzes: async (productId) => {
    const token = get().token
    if (!token) throw new Error("NO_TOKEN")
    const origin = getPlatformOriginHeader()

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(origin ? { "X-Platform-Origin": origin } : {}),
      },
      body: JSON.stringify({ product_id: productId }),
    })

    await assertAuth(res)

    if (!res.ok) {
      throw new Error(await res.text())
    }

    const data = await res.json()
    set({
      quizzes: data.map((q: any) => ({
        id: q.id,
        title: q.title,
        subjectId: q.subjectId,
        brandId: q.brandId,
        grade: Number(q.gradeFrom ?? 9), // fallback if missing
        subject: q.subject != null ? String(q.subject) : undefined,
      })),
    })
  },

  // ========================
  // SELECTED VALUES
  // ========================
  selectedGrade: 9, // default, choose what you want
  selectedProduct: "",
  selectedQuiz: "",

  selectedBrandId: "",
  selectedSubjectId: "",
  selectedCurriculumId: "",
  isLoadingCurriculum: false,
  curriculumRequestId: 0,

  setSelectedProduct: (id) =>
    set((s) => ({
      selectedProduct: id,
      selectedQuiz: "",
      selectedBrandId: "",
      selectedSubjectId: "",
      selectedCurriculumId: "",
      selectedGrade: 9,
      quizzes: [],
      isLoadingCurriculum: false,
      curriculumRequestId: s.curriculumRequestId + 1,
    })),

  setSelectedQuiz: (quizId) => {
    const quiz = get().quizzes.find((q) => String(q.id) === String(quizId))
    const reqId = get().curriculumRequestId + 1

    set({
      selectedQuiz: quizId,
      selectedBrandId: quiz ? String(quiz.brandId) : "",
      selectedSubjectId: quiz ? String(quiz.subjectId) : "",
      selectedCurriculumId: "",
      selectedGrade: quiz ? Number(quiz.grade) : 9,
      isLoadingCurriculum: !!quiz,
      curriculumRequestId: reqId,
    })

    if (!quiz) return

    const token = get().token
    if (!token) {
      set({ isLoadingCurriculum: false })
      return console.warn("No token. Cannot load curriculum.")
    }

    void (async () => {
      const origin = getPlatformOriginHeader()
      try {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(origin ? { "X-Platform-Origin": origin } : {}),
          },
          body: JSON.stringify({
            subjectId: String(quiz.subjectId),
            brandId: String(quiz.brandId),
          }),
        })

        if (get().curriculumRequestId !== reqId) return

        if (!res.ok) {
          console.error("Failed to fetch curriculum list:", await res.text())
          set({ isLoadingCurriculum: false })
          return
        }

        const data = (await res.json()) as { id: number | string; title?: string }[]
        const first = Array.isArray(data) && data.length > 0 ? data[0] : null

        if (get().curriculumRequestId !== reqId) return

        set({
          selectedCurriculumId: first ? String(first.id) : "",
          isLoadingCurriculum: false,
        })
      } catch (e) {
        console.error("Curriculum fetch error:", e)
        if (get().curriculumRequestId === reqId) {
          set({ isLoadingCurriculum: false })
        }
      }
    })()
  },

  setSelectedGrade: (grade) => set({ selectedGrade: grade }),

  // ========================
  // FILE (ephemeral)
  // ========================
  file: null,
  setFile: (file) => set({ file }),
  clearFile: () => set({ file: null }),

  // ========================
  // PROBLEMS
  // ========================
  problems: loadProblems(),

  addProblem: (problem) => {
    const updated = [...get().problems, problem]
    saveProblems(updated)
    set({ problems: updated })
  },

  updateProblem: (id, updates) => {
    const updated = get().problems.map((p) => (p.id === id ? { ...p, ...updates } : p))
    saveProblems(updated)
    set({ problems: updated })
  },

  disapproveProblem: (id) => {
    const problem = get().problems.find(p => p.id === id)
    if (!problem) return

    get().updateProblem(id, {
      approved: false,
    })
  },

  approveProblem: (id) => {
    const problem = get().problems.find(p => p.id === id)
    if (!problem) return

    get().updateProblem(id, {
      approved: true,
    })
  },

  removeProblems: (ids) => {
    const updated = get().problems.filter((p) => !ids.includes(p.id))
    saveProblems(updated)
    set({ problems: updated })
  },

  // ========================
  // UI
  // ========================
  currentProblemId: null,
  setCurrentProblemId: (id) => set({ currentProblemId: id }),
}))
