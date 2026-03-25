import { create } from 'zustand'
import { CanvasElement } from '../types/card'
import { v4 as uuidv4 } from 'uuid'

type NewElement = Omit<CanvasElement, 'id'>

interface ElementsState {
  elements: CanvasElement[]
  selectedId: string | null
  editingCardId: string | null
  addElement: (element: NewElement) => string
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  removeElement: (id: string) => void
  setSelected: (id: string | null) => void
  setEditingCard: (id: string | null) => void
  getElement: (id: string) => CanvasElement | undefined
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  duplicateElement: (id: string) => string | null
  lockElement: (id: string) => void
  unlockElement: (id: string) => void
  addImageToCard: (cardId: string, src: string) => void
  removeImageFromCard: (cardId: string, imageId: string) => void
  clear: () => void
}

export const useElementsStore = create<ElementsState>((set, get) => ({
  elements: [],
  selectedId: null,
  editingCardId: null,

  addElement: (element) => {
    const id = uuidv4()
    const newElement = { ...element, id } as CanvasElement
    set((state) => ({ elements: [...state.elements, newElement] }))
    return id
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } as CanvasElement : el
      )
    }))
  },

  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      editingCardId: state.editingCardId === id ? null : state.editingCardId
    }))
  },

  setSelected: (id) => set({ selectedId: id }),

  setEditingCard: (id) => set({ editingCardId: id }),

  getElement: (id) => get().elements.find((el) => el.id === id),

  bringToFront: (id) => {
    set((state) => {
      const elements = [...state.elements]
      const idx = elements.findIndex((el) => el.id === id)
      if (idx !== -1) {
        const [element] = elements.splice(idx, 1)
        elements.push(element)
      }
      return { elements }
    })
  },

  sendToBack: (id) => {
    set((state) => {
      const elements = [...state.elements]
      const idx = elements.findIndex((el) => el.id === id)
      if (idx !== -1) {
        const [element] = elements.splice(idx, 1)
        elements.unshift(element)
      }
      return { elements }
    })
  },

  duplicateElement: (id) => {
    const element = get().getElement(id)
    if (!element) return null
    const newId = uuidv4()
    const duplicated = {
      ...element,
      id: newId,
      position: {
        x: element.position.x + 20,
        y: element.position.y + 20
      }
    }
    set((state) => ({ elements: [...state.elements, duplicated as CanvasElement] }))
    return newId
  },

  lockElement: (id) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: true } as CanvasElement : el
      )
    }))
  },

  unlockElement: (id) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: false } as CanvasElement : el
      )
    }))
  },

  addImageToCard: (cardId, src) => {
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id !== cardId || el.type !== 'card') return el
        return {
          ...el,
          images: [
            ...el.images,
            {
              id: uuidv4(),
              src,
              position: 'bottom'
            }
          ],
          updatedAt: new Date().toISOString()
        }
      })
    }))
  },

  removeImageFromCard: (cardId, imageId) => {
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id !== cardId || el.type !== 'card') return el
        return {
          ...el,
          images: el.images.filter((image) => image.id !== imageId),
          updatedAt: new Date().toISOString()
        }
      })
    }))
  },

  clear: () => set({ elements: [], selectedId: null, editingCardId: null })
}))
