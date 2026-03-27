import { create } from 'zustand'

export type ToolType = 'none' | 'select' | 'image' | 'card'

interface ToolState {
  currentTool: ToolType
  setTool: (tool: ToolType) => void
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'select',
  setTool: (tool) => set({ currentTool: tool })
}))
