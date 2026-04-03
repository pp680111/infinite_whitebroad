export interface ElectronAPI {
  file: {
    new: () => Promise<{ success: boolean }>
    open: () => Promise<{ success: boolean; data?: unknown; filePath?: string; canceled?: boolean; error?: string }>
    openPath: (filePath: string) => Promise<{ success: boolean; data?: unknown; filePath?: string; canceled?: boolean; error?: string }>
    save: (data: unknown, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    saveAs: (data: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
    getRecent: () => Promise<string[]>
    addRecent: (filePath: string) => Promise<{ success: boolean }>
    getLastOpened: () => Promise<string | null>
    setLastOpened: (filePath: string | null) => Promise<{ success: boolean }>
  }
  onMenuNew: (callback: () => void) => void
  onMenuOpen: (callback: () => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuSaveAs: (callback: () => void) => void
  onMenuUndo: (callback: () => void) => void
  onMenuRedo: (callback: () => void) => void
  onMenuDelete: (callback: () => void) => void
  onMenuSearch: (callback: () => void) => void
  onMenuZoomIn: (callback: () => void) => void
  onMenuZoomOut: (callback: () => void) => void
  onMenuZoomReset: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
