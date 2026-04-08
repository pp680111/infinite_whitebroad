import { create } from 'zustand'
import { useElementsStore } from './elementsStore'
import { useHistoryStore } from './historyStore'
import { CanvasElement, CardElement } from '../types/card'

interface CanvasState {
  documentName: string
  filePath: string | null
  autoSavePath: string | null
  isDirty: boolean
  viewport: { x: number; y: number; zoom: number }
  newDocument: () => void
  setDocumentName: (name: string) => void
  setFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  loadDocument: () => Promise<void>
  loadLastOpenedDocument: () => Promise<void>
  saveDocument: () => Promise<void>
  saveDocumentAs: () => Promise<void>
  autoSaveDocument: () => Promise<boolean>
  getDocumentData: () => {
    version: string
    metadata: {
      name: string
      createdAt: string
      updatedAt: string
      viewport: { x: number; y: number; zoom: number }
    }
    canvasState: { elements: CanvasElement[] }
    searchIndex: string[]
  }
  addCard: (x: number, y: number) => string
}

type LoadedDocumentData = {
  metadata?: { name?: string; viewport?: { x: number; y: number; zoom: number } }
  canvasState?: { elements?: CanvasElement[] }
}

const DEFAULT_DOCUMENT_NAME = '未命名'
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }

function hydrateDocument(
  data: LoadedDocumentData,
  filePath: string | null,
  set: (partial: Partial<CanvasState>) => void
) {
  useHistoryStore.getState().clear()
  useElementsStore.getState().clear()
  if (data.canvasState?.elements) {
    data.canvasState.elements.forEach((el) => {
      useElementsStore.getState().insertElement(el)
    })
  }

  set({
    documentName: data.metadata?.name || DEFAULT_DOCUMENT_NAME,
    filePath,
    autoSavePath: filePath,
    isDirty: false,
    viewport: data.metadata?.viewport || DEFAULT_VIEWPORT
  })
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  documentName: DEFAULT_DOCUMENT_NAME,
  filePath: null,
  autoSavePath: null,
  isDirty: false,
  viewport: DEFAULT_VIEWPORT,

  newDocument: () => {
    const { filePath, autoSavePath } = get()
    if (window.electronAPI && !filePath && autoSavePath) {
      void window.electronAPI.file.delete(autoSavePath)
    }

    useHistoryStore.getState().clear()
    useElementsStore.getState().clear()
    set({
      documentName: DEFAULT_DOCUMENT_NAME,
      filePath: null,
      autoSavePath: null,
      isDirty: false,
      viewport: DEFAULT_VIEWPORT
    })
    if (window.electronAPI) {
      void window.electronAPI.file.setLastOpened(null)
    }
  },

  setDocumentName: (name) => set({ documentName: name, isDirty: true }),
  setFilePath: (path) => set({ filePath: path }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setViewport: (viewport) => set({ viewport }),

  getDocumentData: () => {
    const { documentName, viewport } = get()
    const elements = useElementsStore.getState().elements
    const searchIndex = elements
      .filter((el) => el.type === 'card')
      .map((el) => {
        const card = el as CardElement
        return [card.id, card.title || '', card.content.replace(/<[^>]*>/g, '')].join('\x00')
      })

    return {
      version: '1.0',
      metadata: {
        name: documentName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewport
      },
      canvasState: { elements },
      searchIndex
    }
  },

  loadDocument: async () => {
    if (!window.electronAPI) {
      console.warn('Load document failed: electronAPI not available')
      return
    }

    const { filePath: currentFilePath, autoSavePath: currentAutoSavePath } = get()
    if (!currentFilePath && currentAutoSavePath) {
      await window.electronAPI.file.delete(currentAutoSavePath)
    }

    const result = await window.electronAPI.file.open()
    if (!result.success || !result.data) return

    hydrateDocument(result.data as LoadedDocumentData, result.filePath || null, set)
    if (result.filePath) {
      await window.electronAPI.file.addRecent(result.filePath)
      await window.electronAPI.file.setLastOpened(result.filePath)
    }
  },

  loadLastOpenedDocument: async () => {
    if (!window.electronAPI) return

    const { filePath: currentFilePath, autoSavePath: currentAutoSavePath } = get()
    if (!currentFilePath && currentAutoSavePath) {
      await window.electronAPI.file.delete(currentAutoSavePath)
    }

    const lastOpenedPath = await window.electronAPI.file.getLastOpened()
    if (!lastOpenedPath) return

    const result = await window.electronAPI.file.openPath(lastOpenedPath)
    if (!result.success || !result.data) {
      await window.electronAPI.file.setLastOpened(null)
      return
    }

    hydrateDocument(result.data as LoadedDocumentData, result.filePath || null, set)
    if (result.filePath) {
      await window.electronAPI.file.addRecent(result.filePath)
      await window.electronAPI.file.setLastOpened(result.filePath)
    }
  },

  saveDocument: async () => {
    if (!window.electronAPI) {
      console.warn('Save document failed: electronAPI not available')
      return
    }

    const { filePath, autoSavePath } = get()
    const data = get().getDocumentData()
    const result = filePath
      ? await window.electronAPI.file.save(data, filePath)
      : await window.electronAPI.file.saveAs(data)

    if (result.success && result.filePath) {
      if (!filePath && autoSavePath && autoSavePath !== result.filePath) {
        await window.electronAPI.file.delete(autoSavePath)
      }
      set({ filePath: result.filePath, autoSavePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
      await window.electronAPI.file.setLastOpened(result.filePath)
    }
  },

  saveDocumentAs: async () => {
    if (!window.electronAPI) {
      console.warn('Save document failed: electronAPI not available')
      return
    }

    const { filePath, autoSavePath } = get()
    const data = get().getDocumentData()
    const result = await window.electronAPI.file.saveAs(data)
    if (result.success && result.filePath) {
      if (!filePath && autoSavePath && autoSavePath !== result.filePath) {
        await window.electronAPI.file.delete(autoSavePath)
      }
      set({ filePath: result.filePath, autoSavePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
      await window.electronAPI.file.setLastOpened(result.filePath)
    }
  },

  autoSaveDocument: async () => {
    if (!window.electronAPI) return false

    const { isDirty, filePath, autoSavePath } = get()
    if (!isDirty) return false

    const data = get().getDocumentData()
    const targetPath = filePath || autoSavePath || undefined
    const result = await window.electronAPI.file.autoSave(data, targetPath, !filePath)
    if (!result.success || !result.filePath) return false

    set({
      autoSavePath: result.filePath,
      isDirty: false
    })
    return true
  },

  addCard: (x: number, y: number) => {
    const cardData = {
      type: 'card' as const,
      position: { x, y },
      size: { width: 200, height: 150 },
      title: '',
      content: '',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      locked: false
    }
    const id = useElementsStore.getState().addElement(cardData)
    useElementsStore.getState().setSelected(id)
    useElementsStore.getState().setEditingCard(id)
    set({ isDirty: true })
    return id
  }
}))
