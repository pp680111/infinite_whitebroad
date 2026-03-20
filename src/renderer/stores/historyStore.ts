import { create } from 'zustand'
import { CanvasElement } from '../types/card'

interface Command {
  type: string
  elementId?: string
  previousState?: Partial<CanvasElement>
  newState?: Partial<CanvasElement>
  elements?: CanvasElement[] // For bulk operations
}

interface HistoryState {
  undoStack: Command[]
  redoStack: Command[]
  maxSize: number
  pushCommand: (command: Command) => void
  undo: () => Command | null
  redo: () => Command | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxSize: 50,

  pushCommand: (command) => {
    set((state) => {
      const newStack = [...state.undoStack, command]
      if (newStack.length > state.maxSize) {
        newStack.shift()
      }
      return { undoStack: newStack, redoStack: [] }
    })
  },

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return null
    const command = undoStack[undoStack.length - 1]
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, command]
    }))
    return command
  },

  redo: () => {
    const { redoStack } = get()
    if (redoStack.length === 0) return null
    const command = redoStack[redoStack.length - 1]
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, command]
    }))
    return command
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  clear: () => set({ undoStack: [], redoStack: [] })
}))
