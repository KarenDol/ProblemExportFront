import { create } from "zustand"

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

  // Products / Quizzes / Subjects
  products: Option[]
  quizzes: QuizOption[]
  subjects: Option[]

  fetchProducts: () => Promise<void>
  fetchQuizzes: (productId: string) => Promise<void>
  fetchSubjects: (subjectId: string, brandId: string) => Promise<void>

  selectedProduct: string
  selectedQuiz: string
  selectedSubject: string

  selectedBrandId: string
  selectedSubjectId: string
  selectedGrade: number

  setSelectedProduct: (id: string) => void
  setSelectedQuiz: (id: string) => void
  setSelectedSubject: (id: string) => void
  setSelectedGrade: (grade: number) => void

  // File (ephemeral)
  file: File | null
  setFile: (file: File | null) => void
  clearFile: () => void

  // Problems
  problems: Problem[]
  addProblem: (problem: Problem) => void
  updateProblem: (id: string, updates: Partial<Problem>) => void
  approveProblem: (id: string) => void
  approveAllProblems: () => void
  removeProblems: (ids: string[]) => void
  clearProblems: () => void

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
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    set({
      isLoggedIn: false,
      token: null,
      userEmail: "",
    })
  },

  // ========================
  // PRODUCTS / QUIZZES / SUBJECTS
  // ========================
  products: [],
  quizzes: [],
  subjects: [],

  fetchProducts: async () => {
    const token = get().token
    if (!token) throw new Error("NO_TOKEN")

    const res = await fetch("/api/products", {
      headers: { Authorization: `Bearer ${token}` },
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

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
      })),
    })
  },


  fetchSubjects: async (subjectId, brandId) => {
    const token = get().token
    if (!token) return console.warn("No token. Cannot fetch subjects.")

    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subjectId, brandId }),
    })

    if (!res.ok) return console.error("Failed to fetch subjects:", await res.text())

    const data = (await res.json()) as any[]
    set({
      subjects: data.map((s) => ({ id: s.id, title: s.title })),
    })
  },

  // ========================
  // SELECTED VALUES
  // ========================
  selectedGrade: 9, // default, choose what you want
  selectedProduct: "",
  selectedQuiz: "",
  selectedSubject: "",

  selectedBrandId: "",
  selectedSubjectId: "",

  setSelectedProduct: (id) =>
    set({
      selectedProduct: id,
      selectedQuiz: "",
      selectedSubject: "",
      selectedBrandId: "",
      selectedSubjectId: "",
      selectedGrade: 9,
      quizzes: [],
      subjects: [],
    }),

  setSelectedQuiz: (quizId) => {
    const quiz = get().quizzes.find((q) => String(q.id) === String(quizId))

    set({
      selectedQuiz: quizId,
      selectedSubject: "",
      selectedBrandId: quiz ? String(quiz.brandId) : "",
      selectedSubjectId: quiz ? String(quiz.subjectId) : "",
      selectedGrade: quiz ? Number(quiz.grade) : 9,
      subjects: [],
    })

    if (quiz) {
      get().fetchSubjects(String(quiz.subjectId), String(quiz.brandId))
    }
  },

  setSelectedSubject: (id) => set({ selectedSubject: id }),

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

  approveProblem: (id) => get().updateProblem(id, { approved: true }),

  approveAllProblems: () => {
    const updated = get().problems.map((p) => ({ ...p, approved: true }))
    saveProblems(updated)
    set({ problems: updated })
  },

  clearProblems: () => {
    storage.remove("problems")
    set({ problems: [] })
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
