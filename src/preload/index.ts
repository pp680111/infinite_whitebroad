import { contextBridge, ipcRenderer } from 'electron'

const api = {
  file: {
    new: () => ipcRenderer.invoke('file:new'),
    open: () => ipcRenderer.invoke('file:open'),
    save: (data: unknown, filePath?: string) => ipcRenderer.invoke('file:save', { data, filePath }),
    saveAs: (data: unknown) => ipcRenderer.invoke('file:save-as', { data }),
    getRecent: () => ipcRenderer.invoke('file:get-recent'),
    addRecent: (filePath: string) => ipcRenderer.invoke('file:add-recent', filePath)
  },
  onMenuNew: (callback: () => void) => ipcRenderer.on('menu:new', callback),
  onMenuOpen: (callback: () => void) => ipcRenderer.on('menu:open', callback),
  onMenuSave: (callback: () => void) => ipcRenderer.on('menu:save', callback),
  onMenuSaveAs: (callback: () => void) => ipcRenderer.on('menu:save-as', callback),
  onMenuUndo: (callback: () => void) => ipcRenderer.on('menu:undo', callback),
  onMenuRedo: (callback: () => void) => ipcRenderer.on('menu:redo', callback),
  onMenuDelete: (callback: () => void) => ipcRenderer.on('menu:delete', callback),
  onMenuSearch: (callback: () => void) => ipcRenderer.on('menu:search', callback),
  onMenuZoomIn: (callback: () => void) => ipcRenderer.on('menu:zoom-in', callback),
  onMenuZoomOut: (callback: () => void) => ipcRenderer.on('menu:zoom-out', callback),
  onMenuZoomReset: (callback: () => void) => ipcRenderer.on('menu:zoom-reset', callback)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
