import { create } from 'zustand'

export type ToolType = 'select' | 'rectangle' | 'ellipse' | 'image' | 'card'

interface ToolState {
  currentTool: ToolType
  setTool: (tool: ToolType) => void
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'select',
  setTool: (tool) => set({ currentTool: tool })
}))
