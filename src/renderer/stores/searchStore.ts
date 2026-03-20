import { create } from 'zustand'

interface SearchState {
  isOpen: boolean
  query: string
  results: string[] // Card IDs
  currentIndex: number
  open: () => void
  close: () => void
  setQuery: (query: string) => void
  setResults: (results: string[]) => void
  nextResult: () => void
  prevResult: () => void
  clearResults: () => void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: '',
  results: [],
  currentIndex: -1,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '', results: [], currentIndex: -1 }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, currentIndex: results.length > 0 ? 0 : -1 }),
  nextResult: () => {
    const { results, currentIndex } = get()
    if (results.length === 0) return
    set({ currentIndex: currentIndex >= results.length - 1 ? 0 : currentIndex + 1 })
  },
  prevResult: () => {
    const { results, currentIndex } = get()
    if (results.length === 0) return
    set({ currentIndex: currentIndex <= 0 ? results.length - 1 : currentIndex - 1 })
  },
  clearResults: () => set({ results: [], currentIndex: -1 })
}))
