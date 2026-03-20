# Infinite Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete infinite canvas desktop application for personal knowledge card management using Electron + React 18 + Fabric.js 6.x + Zustand + TailwindCSS.

**Architecture:** Electron main/renderer分离架构，主进程负责窗口管理/文件系统/原生菜单，渲染进程负责Fabric.js画布渲染和React UI组件。状态管理使用Zustand，持久化使用electron-store，文件格式为自定义.json。

**Tech Stack:** Electron 28.x + React 18.2 + Fabric.js 6.4 + Zustand 4.x + TailwindCSS 3.x + Vite 5.x + electron-builder 24.x

---

## Chunk 1: Project Scaffolding

### Task 1: Initialize Electron + Vite + React Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main/index.ts`
- Create: `src/main/menu.ts`
- Create: `src/main/ipc.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles/index.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "infinite-whiteboard",
  "version": "1.0.0",
  "description": "Personal knowledge card collection on infinite canvas",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "fabric": "^6.4.0",
    "zustand": "^4.5.0",
    "electron-store": "^8.2.0",
    "uuid": "^9.0.0",
    "dompurify": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/dompurify": "^3.0.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Run npm install**

Run: `cd E:/otherCode/infinite_whiteboard && npm install`
Expected: Dependencies installed successfully

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-store']
            }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer')
    }
  },
  root: '.',
  build: {
    outDir: 'dist'
  }
})
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#f5f5f5',
          grid: '#e0e0e0'
        },
        card: {
          bg: '#fefefe',
          border: '#e8e8e8'
        }
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 7: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Create electron-builder.json**

```json
{
  "appId": "com.infinite-whiteboard.app",
  "productName": "Infinite Whiteboard",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "mac": {
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- [ ] **Step 9: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Infinite Whiteboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupMenu } from './menu'
import { setupIPC } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  setupMenu(mainWindow)
  setupIPC(mainWindow)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 11: Create src/main/menu.ts**

```typescript
import { Menu, BrowserWindow, app } from 'electron'

export function setupMenu(mainWindow: BrowserWindow) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new') },
        { label: '打开...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu:open') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:save') },
        { label: '另存为...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu:save-as') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow.webContents.send('menu:undo') },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow.webContents.send('menu:redo') },
        { type: 'separator' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '删除', accelerator: 'Delete', click: () => mainWindow.webContents.send('menu:delete') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '搜索', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu:search') },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.send('menu:zoom-in') },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.send('menu:zoom-out') },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.send('menu:zoom-reset') }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
```

- [ ] **Step 12: Create src/main/ipc.ts**

```typescript
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import Store from 'electron-store'

const store = new Store<{ recentFiles: string[] }>({
  defaults: { recentFiles: [] }
})

export function setupIPC(mainWindow: BrowserWindow) {
  ipcMain.handle('file:new', () => {
    return { success: true }
  })

  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Whiteboard', extensions: ['whiteboard'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    const filePath = result.filePaths[0]
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      return { success: true, data, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to read file' }
    }
  })

  ipcMain.handle('file:save', async (_, { data, filePath }) => {
    if (!filePath) {
      return ipcMain.emit('file:save-as', _, { data })
    }
    try {
      const tmpPath = filePath + '.tmp'
      await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to save file' }
    }
  })

  ipcMain.handle('file:save-as', async (_, { data }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Whiteboard', extensions: ['whiteboard'] }]
    })
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }
    const filePath = result.filePath
    try {
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to save file' }
    }
  })

  ipcMain.handle('file:get-recent', () => {
    return store.get('recentFiles', [])
  })

  ipcMain.handle('file:add-recent', (_, filePath: string) => {
    const recent = store.get('recentFiles', [])
    const filtered = recent.filter((f: string) => f !== filePath)
    filtered.unshift(filePath)
    store.set('recentFiles', filtered.slice(0, 10))
    return { success: true }
  })
}
```

- [ ] **Step 13: Create src/preload/index.ts**

```typescript
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
```

- [ ] **Step 14: Create src/renderer/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 15: Create src/renderer/styles/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 16: Create src/renderer/App.tsx**

```typescript
import { useEffect } from 'react'
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas'
import { useCanvasStore } from './stores/canvasStore'
import { electronAPI } from './types/electronAPI'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export default function App() {
  const { newDocument, loadDocument, saveDocument, saveDocumentAs } = useCanvasStore()

  useEffect(() => {
    electronAPI.onMenuNew(() => newDocument())
    electronAPI.onMenuOpen(() => loadDocument())
    electronAPI.onMenuSave(() => saveDocument())
    electronAPI.onMenuSaveAs(() => saveDocumentAs())
  }, [newDocument, loadDocument, saveDocument, saveDocumentAs])

  return <InfiniteCanvas />
}
```

- [ ] **Step 17: Create src/renderer/types/electronAPI.ts**

```typescript
export interface ElectronAPI {
  file: {
    new: () => Promise<{ success: boolean }>
    open: () => Promise<{ success: boolean; data?: unknown; filePath?: string; canceled?: boolean; error?: string }>
    save: (data: unknown, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    saveAs: (data: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
    getRecent: () => Promise<string[]>
    addRecent: (filePath: string) => Promise<{ success: boolean }>
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
```

- [ ] **Step 18: Create src/renderer/stores/canvasStore.ts**

```typescript
import { create } from 'zustand'

interface CanvasState {
  documentName: string
  filePath: string | null
  isDirty: boolean
  viewport: { x: number; y: number; zoom: number }
  newDocument: () => void
  setDocumentName: (name: string) => void
  setFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  loadDocument: () => Promise<void>
  saveDocument: () => Promise<void>
  saveDocumentAs: () => Promise<void>
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  documentName: '未命名',
  filePath: null,
  isDirty: false,
  viewport: { x: 0, y: 0, zoom: 1 },

  newDocument: () => {
    set({ documentName: '未命名', filePath: null, isDirty: false, viewport: { x: 0, y: 0, zoom: 1 } })
  },

  setDocumentName: (name) => set({ documentName: name, isDirty: true }),
  setFilePath: (path) => set({ filePath: path }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setViewport: (viewport) => set({ viewport }),

  loadDocument: async () => {
    const result = await window.electronAPI.file.open()
    if (result.success && result.data) {
      set({
        documentName: (result.data as { metadata?: { name?: string } }).metadata?.name || '未命名',
        filePath: result.filePath || null,
        isDirty: false,
        viewport: (result.data as { metadata?: { viewport?: { x: number; y: number; zoom: number } } }).metadata?.viewport || { x: 0, y: 0, zoom: 1 }
      })
    }
  },

  saveDocument: async () => {
    const { filePath, documentName, viewport } = get()
    const data = {
      version: '1.0',
      metadata: { name: documentName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), viewport },
      canvasState: {},
      searchIndex: []
    }
    const result = filePath
      ? await window.electronAPI.file.save(data, filePath)
      : await window.electronAPI.file.saveAs(data)
    if (result.success && result.filePath) {
      set({ filePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
    }
  },

  saveDocumentAs: async () => {
    const { documentName, viewport } = get()
    const data = {
      version: '1.0',
      metadata: { name: documentName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), viewport },
      canvasState: {},
      searchIndex: []
    }
    const result = await window.electronAPI.file.saveAs(data)
    if (result.success && result.filePath) {
      set({ filePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
    }
  }
}))
```

- [ ] **Step 19: Create src/renderer/components/Canvas/InfiniteCanvas.tsx**

```typescript
import { useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, FabricObject } from 'fabric'

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const [zoom, setZoom] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f5f5f5',
      selection: true
    })
    fabricRef.current = canvas

    const handleResize = () => {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight })
      canvas.renderAll()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
      fabricRef.current = null
    }
  }, [])

  const handleZoomIn = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const newZoom = Math.min(canvas.getZoom() * 1.2, 4)
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom)
    setZoom(Math.round(newZoom * 100))
  }

  const handleZoomOut = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const newZoom = Math.max(canvas.getZoom() / 1.2, 0.1)
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom)
    setZoom(Math.round(newZoom * 100))
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
        {zoom}%
      </div>
    </div>
  )
}
```

- [ ] **Step 20: Verify dev server starts**

Run: `cd E:/otherCode/infinite_whiteboard && npm run dev`
Expected: Vite dev server starts on port 5173, Electron window opens

- [ ] **Step 21: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js electron-builder.json index.html src/
git commit -m "feat: project scaffolding with Electron + Vite + React"
```

---

## Chunk 2: Core Canvas System (Fabric.js Integration)

### Task 2: Implement Infinite Canvas with Pan/Zoom

**Files:**
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`
- Create: `src/renderer/components/Canvas/useCanvasControls.ts`

- [ ] **Step 1: Write test for canvas pan/zoom behavior**

Create test file placeholder (unit tests for Fabric.js integration are complex - focus on manual verification)

- [ ] **Step 2: Implement canvas controls hook**

```typescript
// src/renderer/components/Canvas/useCanvasControls.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, TPointerEventInfo } from 'fabric'

interface UseCanvasControlsOptions {
  canvas: FabricCanvas | null
  minZoom?: number
  maxZoom?: number
}

interface UseCanvasControlsReturn {
  zoom: number
  isPanning: boolean
  handleWheel: (opt: TPointerEventInfo<TPointerEvent>) => void
  startPan: (e: TPointerEvent) => void
  updatePan: (e: TPointerEvent) => void
  endPan: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

export function useCanvasControls(
  options: UseCanvasControlsOptions
): UseCanvasControlsReturn {
  const { canvas, minZoom = 0.1, maxZoom = 4 } = options
  const [zoom, setZoom] = useState(100)
  const [isPanning, setIsPanning] = useState(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const spaceDownRef = useRef(false)

  const handleWheel = useCallback((opt: TPointerEventInfo<TPointerEvent>) => {
    if (!canvas) return
    const delta = opt.e.deltaY
    let newZoom = canvas.getZoom() * (delta > 0 ? 0.9 : 1.1)
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))

    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom)
    setZoom(Math.round(newZoom * 100))
    opt.e.preventDefault()
    opt.e.stopPropagation()
  }, [canvas, minZoom, maxZoom])

  const startPan = useCallback((e: TPointerEvent) => {
    if (!canvas || !spaceDownRef.current) return
    canvas.selection = false
    canvas.defaultCursor = 'grabbing'
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    setIsPanning(true)
  }, [canvas])

  const updatePan = useCallback((e: TPointerEvent) => {
    if (!canvas || !isPanning) return
    const vpt = canvas.viewportTransform!
    vpt[4] += e.clientX - lastPosRef.current.x
    vpt[5] += e.clientY - lastPosRef.current.y
    canvas.requestRenderAll()
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }, [canvas, isPanning])

  const endPan = useCallback(() => {
    if (!canvas) return
    canvas.selection = true
    canvas.defaultCursor = 'default'
    setIsPanning(false)
  }, [canvas])

  const zoomIn = useCallback(() => {
    if (!canvas) return
    const newZoom = Math.min(canvas.getZoom() * 1.2, maxZoom)
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom)
    setZoom(Math.round(newZoom * 100))
  }, [canvas, maxZoom])

  const zoomOut = useCallback(() => {
    if (!canvas) return
    const newZoom = Math.max(canvas.getZoom() / 1.2, minZoom)
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 }, newZoom)
    setZoom(Math.round(newZoom * 100))
  }, [canvas, minZoom])

  const resetZoom = useCallback(() => {
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(100)
  }, [canvas])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDownRef.current) {
        spaceDownRef.current = true
        if (canvas) canvas.defaultCursor = 'grab'
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        if (canvas) {
          canvas.defaultCursor = 'default'
          canvas.selection = true
        }
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [canvas])

  return {
    zoom,
    isPanning,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom
  }
}
```

- [ ] **Step 3: Update InfiniteCanvas to use controls**

```typescript
// src/renderer/components/Canvas/InfiniteCanvas.tsx - rewrite
import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, TPointerEventInfo, FabricObject } from 'fabric'
import { useCanvasControls } from './useCanvasControls'

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f5f5f5',
      selection: true
    })
    fabricRef.current = canvas

    const handleResize = () => {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight })
      canvas.renderAll()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
      fabricRef.current = null
    }
  }, [])

  const {
    zoom: controlZoom,
    isPanning,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom
  } = useCanvasControls({ canvas: fabricRef.current })

  useEffect(() => {
    setZoom(controlZoom)
  }, [controlZoom])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.on('mouse:wheel', handleWheel)

    const onMouseDown = (opt: { e: TPointerEvent }) => startPan(opt.e)
    const onMouseMove = (opt: { e: TPointerEvent }) => updatePan(opt.e)
    const onMouseUp = () => endPan()

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)

    return () => {
      canvas.off('mouse:wheel', handleWheel)
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
    }
  }, [handleWheel, startPan, updatePan, endPan])

  const handleZoomIn = () => zoomIn()
  const handleZoomOut = () => zoomOut()
  const handleResetZoom = () => resetZoom()

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      <div className="canvas-container absolute inset-0">
        <canvas ref={canvasRef} />
      </div>
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm flex items-center gap-2">
        <button onClick={handleZoomOut} className="hover:bg-gray-200 px-2 py-1 rounded">-</button>
        <span>{zoom}%</span>
        <button onClick={handleZoomIn} className="hover:bg-gray-200 px-2 py-1 rounded">+</button>
        <button onClick={handleResetZoom} className="hover:bg-gray-200 px-2 py-1 rounded">reset</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify pan/zoom works**

Manual verification: Canvas should pan with Space+drag and zoom with Ctrl+scroll

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Canvas/
git commit -m "feat: implement canvas pan/zoom controls"
```

---

### Task 3: Implement Card Element Type

**Files:**
- Create: `src/renderer/components/Canvas/CardElement.tsx`
- Create: `src/renderer/stores/elementsStore.ts`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create Card element type definition**

```typescript
// src/renderer/types/card.ts
export interface CardElement {
  id: string
  type: 'card'
  position: { x: number; y: number }
  size: { width: number; height: number }
  title?: string
  content: string // HTML content
  images: { id: string; src: string; position: 'top' | 'bottom' }[]
  createdAt: string
  updatedAt: string
  locked: boolean
}

export interface RectangleElement {
  id: string
  type: 'rectangle'
  position: { x: number; y: number }
  size: { width: number; height: number }
  strokeColor: string
  strokeWidth: number
  locked: boolean
}

export interface EllipseElement {
  id: string
  type: 'ellipse'
  position: { x: number; y: number }
  size: { width: number; height: number }
  strokeColor: string
  strokeWidth: number
  locked: boolean
}

export interface ImageElement {
  id: string
  type: 'image'
  position: { x: number; y: number }
  size: { width: number; height: number }
  src: string // Base64
  locked: boolean
}

export type CanvasElement = CardElement | RectangleElement | EllipseElement | ImageElement
```

- [ ] **Step 2: Create elements store**

```typescript
// src/renderer/stores/elementsStore.ts
import { create } from 'zustand'
import { CanvasElement } from '../types/card'
import { v4 as uuidv4 } from 'uuid'

interface ElementsState {
  elements: CanvasElement[]
  selectedId: string | null
  editingCardId: string | null
  addElement: (element: Omit<CanvasElement, 'id'>) => string
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
        el.id === id ? { ...el, ...updates } : el
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
    set((state) => ({ elements: [...state.elements, duplicated] }))
    return newId
  },

  lockElement: (id) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: true } : el
      )
    }))
  },

  unlockElement: (id) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: false } : el
      )
    }))
  },

  clear: () => set({ elements: [], selectedId: null, editingCardId: null })
}))
```

- [ ] **Step 3: Update InfiniteCanvas to support element creation via double-click**

```typescript
// Add to InfiniteCanvas.tsx - element creation on double-click
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  const handleDblClick = (opt: { e: TPointerEvent; pointer?: { x: number; y: number } }) => {
    const target = canvas.findTarget(opt.e)
    if (!target) {
      // Create new card at double-click position
      const pointer = canvas.getPointer(opt.e)
      const rect = canvas.getElement().getBoundingClientRect()
      const worldPoint = {
        x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
        y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
      }
      addCard(worldPoint.x, worldPoint.y)
    }
  }

  canvas.on('mouse:dblclick', handleDblClick)
  return () => { canvas.off('mouse:dblclick', handleDblClick) }
}, [])
```

- [ ] **Step 4: Create card rendering function**

```typescript
// src/renderer/components/Canvas/renderCard.ts
import { Canvas as FabricCanvas, FabricObject, Rect, Textbox, Group } from 'fabric'

export function renderCard(
  canvas: FabricCanvas,
  card: {
    id: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    title?: string
    content: string
    locked: boolean
  }
): FabricObject {
  const { id, position, size, title, content, locked } = card

  const cardGroup: FabricObject[] = []

  // Card background
  const bg = new Rect({
    width: size.width,
    height: size.height,
    fill: '#fefefe',
    stroke: '#e8e8e8',
    strokeWidth: 1,
    rx: 8,
    ry: 8,
    shadow: {
      color: 'rgba(0,0,0,0.1)',
      blur: 10,
      offsetX: 2,
      offsetY: 2
    }
  })
  cardGroup.push(bg)

  // Title if present
  if (title) {
    const titleText = new Textbox(title, {
      width: size.width - 20,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#333',
      left: 10,
      top: 10,
      editable: false
    })
    cardGroup.push(titleText)
  }

  // Content
  const contentText = new Textbox(content || 'Double-click to edit', {
    width: size.width - 20,
    fontSize: 13,
    fill: content ? '#555' : '#999',
    left: 10,
    top: title ? 35 : 10,
    editable: false
  })
  cardGroup.push(contentText)

  const group = new Group(cardGroup, {
    left: position.x,
    top: position.y,
    selectable: !locked,
    hasControls: !locked,
    hasBorders: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    data: { id, type: 'card' }
  })

  return group
}
```

- [ ] **Step 5: Add Card to canvas store and wire up**

```typescript
// Add to canvasStore.ts
import { useElementsStore } from './elementsStore'

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // ... existing code

  addCard: (x: number, y: number) => {
    const id = useElementsStore.getState().addElement({
      type: 'card',
      position: { x, y },
      size: { width: 200, height: 150 },
      title: '',
      content: '',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      locked: false
    })
    useElementsStore.getState().setSelected(id)
    useElementsStore.getState().setEditingCard(id)
    set({ isDirty: true })
  }
}))
```

- [ ] **Step 6: Test card creation with double-click**

Manual verification: Double-click on empty canvas should create a new card

- [ ] **Step 7: Commit**

```bash
git add src/renderer/types/card.ts src/renderer/stores/elementsStore.ts src/renderer/components/Canvas/
git commit -m "feat: implement card element type with double-click creation"
```

---

## Chunk 3: Card Editing System

### Task 4: Implement Card Double-Click Editing

**Files:**
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`
- Create: `src/renderer/components/CardEditor/CardEditor.tsx`

- [ ] **Step 1: Create CardEditor component**

```typescript
// src/renderer/components/CardEditor/CardEditor.tsx
import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'

interface CardEditorProps {
  cardId: string
  initialTitle: string
  initialContent: string
  position: { x: number; y: number; width: number; height: number }
  onSave: (title: string, content: string) => void
  onCancel: () => void
}

export function CardEditor({
  cardId,
  initialTitle,
  initialContent,
  position,
  onSave,
  onCancel
}: CardEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.focus()
  }, [])

  const handleSave = () => {
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'],
      ALLOWED_ATTR: ['href']
    })
    onSave(title, sanitizedContent)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: Math.max(200, position.width),
        minHeight: Math.max(100, position.height)
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="p-3 border-b border-gray-100 flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="flex-1 text-sm font-semibold outline-none bg-transparent"
        />
      </div>
      <div
        ref={contentRef}
        contentEditable
        className="p-3 text-sm outline-none min-h-[60px]"
        style={{ minHeight: '60px' }}
        onInput={(e) => setContent(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="p-2 border-t border-gray-100 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update InfiniteCanvas to handle card editing**

```typescript
// Modify InfiniteCanvas.tsx - add card editing state and handlers
import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, TPointerEventInfo, FabricObject } from 'fabric'
import { useCanvasControls } from './useCanvasControls'
import { useElementsStore } from '../../stores/elementsStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { CardEditor } from '../CardEditor/CardEditor'
import { CardElement } from '../../types/card'

export function InfiniteCanvas() {
  // ... existing state and refs
  const [editingCard, setEditingCard] = useState<{ id: string; title: string; content: string; position: { x: number; y: number; width: number; height: number } } | null>(null)

  // ... existing setup

  // Handle double-click to edit card
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      const target = canvas.findTarget(opt.e)
      if (target?.data?.type === 'card') {
        const cardEl = useElementsStore.getState().getElement(target.data.id) as CardElement
        if (cardEl && !cardEl.locked) {
          const bound = target.getBoundingRect()
          setEditingCard({
            id: cardEl.id,
            title: cardEl.title || '',
            content: cardEl.content || '',
            position: {
              x: bound.left,
              y: bound.top,
              width: cardEl.size.width,
              height: cardEl.size.height
            }
          })
          useElementsStore.getState().setEditingCard(cardEl.id)
        }
      } else if (!target) {
        // Create new card on double-click empty area
        const pointer = canvas.getPointer(opt.e)
        const worldPoint = {
          x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
          y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
        }
        useCanvasStore.getState().addCard(worldPoint.x, worldPoint.y)
      }
    }

    canvas.on('mouse:dblclick', handleDblClick)
    return () => { canvas.off('mouse:dblclick', handleDblClick) }
  }, [])

  const handleCardSave = useCallback((title: string, content: string) => {
    if (editingCard) {
      useElementsStore.getState().updateElement(editingCard.id, {
        title,
        content,
        updatedAt: new Date().toISOString()
      })
      setEditingCard(null)
      useElementsStore.getState().setEditingCard(null)
      useCanvasStore.getState().setDirty(true)
    }
  }, [editingCard])

  const handleCardCancel = useCallback(() => {
    setEditingCard(null)
    useElementsStore.getState().setEditingCard(null)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      {/* ... background and canvas ... */}
      <div className="canvas-container absolute inset-0">
        <canvas ref={canvasRef} />
      </div>
      {editingCard && (
        <CardEditor
          cardId={editingCard.id}
          initialTitle={editingCard.title}
          initialContent={editingCard.content}
          position={editingCard.position}
          onSave={handleCardSave}
          onCancel={handleCardCancel}
        />
      )}
      {/* ... zoom controls ... */}
    </div>
  )
}
```

- [ ] **Step 3: Test card editing**

Manual verification: Double-click card should open editor, changes should save

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/CardEditor/
git commit -m "feat: implement card editing with rich text support"
```

---

## Chunk 4: Toolbar and Shape Tools

### Task 5: Implement Floating Toolbar

**Files:**
- Create: `src/renderer/components/Toolbar/Toolbar.tsx`
- Create: `src/renderer/stores/toolStore.ts`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create tool store**

```typescript
// src/renderer/stores/toolStore.ts
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
```

- [ ] **Step 2: Create Toolbar component**

```typescript
// src/renderer/components/Toolbar/Toolbar.tsx
import { useToolStore, ToolType } from '../../stores/toolStore'

interface ToolButton {
  type: ToolType
  icon: string
  label: string
}

const tools: ToolButton[] = [
  { type: 'select', icon: '⬚', label: '选择' },
  { type: 'rectangle', icon: '▢', label: '矩形' },
  { type: 'ellipse', icon: '◯', label: '椭圆' },
  { type: 'image', icon: '🖼', label: '图片' },
  { type: 'card', icon: '📝', label: '文本卡片' }
]

export function Toolbar() {
  const { currentTool, setTool } = useToolStore()

  const handleImageClick = async () => {
    setTool('image')
    // Trigger file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Handle image upload
        const reader = new FileReader()
        reader.onload = () => {
          // Add image element to canvas
          // TODO: Implement image addition
          setTool('select')
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 flex items-center gap-1">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => {
            if (tool.type === 'image') {
              handleImageClick()
            } else {
              setTool(tool.type)
            }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
            currentTool === tool.type
              ? 'bg-blue-500 text-white'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Update InfiniteCanvas to render toolbar and handle shape tools**

```typescript
// Add to InfiniteCanvas.tsx
import { Toolbar } from '../Toolbar/Toolbar'
import { useToolStore } from '../../stores/toolStore'

// Add inside component:
const { currentTool, setTool } = useToolStore()

// Modify handleDblClick to check current tool
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
    // If card tool is active, create card
    if (currentTool === 'card') {
      const pointer = canvas.getPointer(opt.e)
      const worldPoint = {
        x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
        y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
      }
      useCanvasStore.getState().addCard(worldPoint.x, worldPoint.y)
      setTool('select')
      return
    }
    // ... rest of dblclick logic
  }
  // ...
}, [currentTool, setTool])

return (
  <div>
    {/* ... */}
    <Toolbar />
    {/* ... */}
  </div>
)
```

- [ ] **Step 4: Add rectangle and ellipse creation to canvas**

```typescript
// Add to InfiniteCanvas - handle shape creation based on tool
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  const handleClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
    if (currentTool === 'select') return
    if (opt.target) return // Don't create if clicking on element

    const pointer = canvas.getPointer(opt.e)
    const worldPoint = {
      x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
      y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
    }

    if (currentTool === 'rectangle') {
      const id = useElementsStore.getState().addElement({
        type: 'rectangle',
        position: worldPoint,
        size: { width: 100, height: 100 },
        strokeColor: '#333',
        strokeWidth: 2,
        locked: false
      })
      useElementsStore.getState().setSelected(id)
      setTool('select')
    } else if (currentTool === 'ellipse') {
      const id = useElementsStore.getState().addElement({
        type: 'ellipse',
        position: worldPoint,
        size: { width: 100, height: 100 },
        strokeColor: '#333',
        strokeWidth: 2,
        locked: false
      })
      useElementsStore.getState().setSelected(id)
      setTool('select')
    }
  }

  canvas.on('mouse:click', handleClick)
  return () => { canvas.off('mouse:click', handleClick) }
}, [currentTool, setTool])
```

- [ ] **Step 5: Render Toolbar and test**

Manual verification: Toolbar appears at bottom center, tools switch correctly

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Toolbar/ src/renderer/stores/toolStore.ts
git commit -m "feat: implement floating toolbar with shape tools"
```

---

## Chunk 5: Right-Click Context Menu

### Task 6: Implement Context Menu

**Files:**
- Create: `src/renderer/components/ContextMenu/ContextMenu.tsx`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create ContextMenu component**

```typescript
// src/renderer/components/ContextMenu/ContextMenu.tsx
import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onLock: () => void
  isLocked: boolean
}

export function ContextMenu({
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onLock,
  isLocked
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onDuplicate(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        复制
      </button>
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        删除
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => { onBringToFront(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        置顶
      </button>
      <button
        onClick={() => { onSendToBack(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        置底
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => { onLock(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        {isLocked ? '解锁' : '锁定'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire up context menu in InfiniteCanvas**

```typescript
// Add to InfiniteCanvas.tsx
import { ContextMenu } from '../ContextMenu/ContextMenu'

// Add state
const [contextMenu, setContextMenu] = useState<{
  x: number
  y: number
  elementId: string
  isLocked: boolean
} | null>(null)

// Add context menu handler to canvas
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  const handleContextMenu = (opt: { e: TPointerEvent; target?: FabricObject }) => {
    if (!opt.target) return
    const id = opt.target.data?.id
    if (!id) return
    const element = useElementsStore.getState().getElement(id)
    if (element) {
      setContextMenu({
        x: opt.e.clientX,
        y: opt.e.clientY,
        elementId: id,
        isLocked: element.locked
      })
    }
  }

  canvas.on('mouse:down', (opt) => {
    if (opt.e.button === 2) { // Right click
      handleContextMenu({ e: opt.e, target: opt.target })
    }
  })

  return () => { canvas.off('mouse:down', handleContextMenu as any) }
}, [])

// Context menu handlers
const handleContextDelete = () => {
  if (contextMenu) {
    useElementsStore.getState().removeElement(contextMenu.elementId)
  }
}

const handleContextDuplicate = () => {
  if (contextMenu) {
    useElementsStore.getState().duplicateElement(contextMenu.elementId)
  }
}

const handleContextBringToFront = () => {
  if (contextMenu) {
    useElementsStore.getState().bringToFront(contextMenu.elementId)
  }
}

const handleContextSendToBack = () => {
  if (contextMenu) {
    useElementsStore.getState().sendToBack(contextMenu.elementId)
  }
}

const handleContextLock = () => {
  if (contextMenu) {
    const element = useElementsStore.getState().getElement(contextMenu.elementId)
    if (element?.locked) {
      useElementsStore.getState().unlockElement(contextMenu.elementId)
    } else {
      useElementsStore.getState().lockElement(contextMenu.elementId)
    }
  }
}

// Add in return JSX
{contextMenu && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={() => setContextMenu(null)}
    onDelete={handleContextDelete}
    onDuplicate={handleContextDuplicate}
    onBringToFront={handleContextBringToFront}
    onSendToBack={handleContextSendToBack}
    onLock={handleContextLock}
    isLocked={contextMenu.isLocked}
  />
)}
```

- [ ] **Step 3: Test context menu**

Manual verification: Right-click on element shows context menu with all options

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ContextMenu/
git commit -m "feat: implement right-click context menu"
```

---

## Chunk 6: Search Panel

### Task 7: Implement Search Functionality

**Files:**
- Create: `src/renderer/components/SearchPanel/SearchPanel.tsx`
- Create: `src/renderer/stores/searchStore.ts`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create search store**

```typescript
// src/renderer/stores/searchStore.ts
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
```

- [ ] **Step 2: Create SearchPanel component**

```typescript
// src/renderer/components/SearchPanel/SearchPanel.tsx
import { useEffect, useRef } from 'react'
import { useSearchStore } from '../../stores/searchStore'
import { useElementsStore } from '../../stores/elementsStore'
import { CardElement } from '../../types/card'

export function SearchPanel() {
  const { isOpen, query, results, currentIndex, close, setQuery, nextResult, prevResult } = useSearchStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      useSearchStore.getState().clearResults()
      return
    }

    // Search through all card elements
    const elements = useElementsStore.getState().elements
    const matchingCards = elements.filter((el) => {
      if (el.type !== 'card') return false
      const card = el as CardElement
      const searchLower = value.toLowerCase()
      const titleMatch = card.title?.toLowerCase().includes(searchLower) || false
      // Strip HTML tags for content search
      const contentText = card.content.replace(/<[^>]*>/g, '')
      const contentMatch = contentText.toLowerCase().includes(searchLower)
      return titleMatch || contentMatch
    })

    useSearchStore.getState().setResults(matchingCards.map((c) => c.id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevResult()
      } else {
        nextResult()
      }
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索卡片内容..."
            className="w-full px-3 py-2 text-sm outline-none"
          />
        </div>
        {results.length > 0 && (
          <div className="p-2 text-xs text-gray-500 text-center">
            {currentIndex + 1} / {results.length} 个结果
            <span className="ml-2 text-gray-400">按 Enter 定位</span>
          </div>
        )}
        {query && results.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            未找到匹配结果
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire up search in InfiniteCanvas**

```typescript
// Add to InfiniteCanvas
import { SearchPanel } from '../SearchPanel/SearchPanel'
import { useSearchStore } from '../../stores/searchStore'
import { electronAPI } from '../../types/electronAPI'

// Add in useEffect for menu events
electronAPI.onMenuSearch(() => {
  useSearchStore.getState().open()
})

// Add keyboard shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      useSearchStore.getState().open()
    }
    if (e.key === 'Escape') {
      useSearchStore.getState().close()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])

// Add in return JSX
<SearchPanel />
```

- [ ] **Step 4: Test search**

Manual verification: Ctrl+F opens search, typing filters cards, Enter navigates results

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/SearchPanel/ src/renderer/stores/searchStore.ts
git commit -m "feat: implement search panel with card content search"
```

---

## Chunk 7: Undo/Redo System

### Task 8: Implement Command Pattern Undo/Redo

**Files:**
- Create: `src/renderer/stores/historyStore.ts`
- Modify: `src/renderer/stores/elementsStore.ts`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create history store with command pattern**

```typescript
// src/renderer/stores/historyStore.ts
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
```

- [ ] **Step 2: Integrate history into elements store**

```typescript
// Modify elementsStore.ts - add history tracking
import { useHistoryStore } from './historyStore'

// In updateElement:
updateElement: (id, updates) => {
  const element = get().getElement(id)
  if (!element) return
  useHistoryStore.getState().pushCommand({
    type: 'update',
    elementId: id,
    previousState: element,
    newState: updates
  })
  set((state) => ({
    elements: state.elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    )
  }))
}

// In removeElement:
removeElement: (id) => {
  const element = get().getElement(id)
  if (!element) return
  useHistoryStore.getState().pushCommand({
    type: 'delete',
    elementId: id,
    previousState: element
  })
  set((state) => ({
    elements: state.elements.filter((el) => el.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId
  }))
}
```

- [ ] **Step 3: Wire up undo/redo in InfiniteCanvas**

```typescript
// Add to InfiniteCanvas useEffect
useEffect(() => {
  electronAPI.onMenuUndo(() => {
    const command = useHistoryStore.getState().undo()
    if (!command) return

    if (command.type === 'update' && command.elementId && command.previousState) {
      useElementsStore.getState().updateElement(command.elementId, command.previousState)
    } else if (command.type === 'delete' && command.elementId && command.previousState) {
      useElementsStore.getState().addElement(command.previousState)
    } else if (command.type === 'create' && command.elementId) {
      useElementsStore.getState().removeElement(command.elementId)
    }
  })

  electronAPI.onMenuRedo(() => {
    const command = useHistoryStore.getState().redo()
    if (!command) return

    if (command.type === 'update' && command.elementId && command.newState) {
      useElementsStore.getState().updateElement(command.elementId, command.newState)
    } else if (command.type === 'delete' && command.elementId) {
      useElementsStore.getState().removeElement(command.elementId)
    } else if (command.type === 'create' && command.elementId && command.previousState) {
      useElementsStore.getState().addElement(command.previousState)
    }
  })
}, [])
```

- [ ] **Step 4: Test undo/redo**

Manual verification: Undo/redo works for create, delete, and update operations

- [ ] **Step 5: Commit**

```bash
git add src/renderer/stores/historyStore.ts
git commit -m "feat: implement undo/redo with command pattern"
```

---

## Chunk 8: File Persistence Integration

### Task 9: Wire Up Complete Save/Load

**Files:**
- Modify: `src/renderer/stores/canvasStore.ts`
- Modify: `src/renderer/stores/elementsStore.ts`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Update canvasStore with full save/load**

```typescript
// Rewrite canvasStore.ts to handle complete persistence
import { create } from 'zustand'
import { useElementsStore } from './elementsStore'
import { CanvasElement } from '../types/card'

interface CanvasState {
  documentName: string
  filePath: string | null
  isDirty: boolean
  viewport: { x: number; y: number; zoom: number }
  newDocument: () => void
  setDocumentName: (name: string) => void
  setFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  loadDocument: () => Promise<void>
  saveDocument: () => Promise<void>
  saveDocumentAs: () => Promise<void>
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
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  documentName: '未命名',
  filePath: null,
  isDirty: false,
  viewport: { x: 0, y: 0, zoom: 1 },

  newDocument: () => {
    useElementsStore.getState().clear()
    set({ documentName: '未命名', filePath: null, isDirty: false, viewport: { x: 0, y: 0, zoom: 1 } })
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
    const result = await window.electronAPI.file.open()
    if (result.success && result.data) {
      const data = result.data as {
        metadata?: { name?: string; viewport?: { x: number; y: number; zoom: number } }
        canvasState?: { elements?: CanvasElement[] }
      }
      useElementsStore.getState().clear()
      if (data.canvasState?.elements) {
        data.canvasState.elements.forEach((el) => {
          useElementsStore.getState().addElement(el)
        })
      }
      set({
        documentName: data.metadata?.name || '未命名',
        filePath: result.filePath || null,
        isDirty: false,
        viewport: data.metadata?.viewport || { x: 0, y: 0, zoom: 1 }
      })
    }
  },

  saveDocument: async () => {
    const { filePath } = get()
    const data = get().getDocumentData()
    const result = filePath
      ? await window.electronAPI.file.save(data, filePath)
      : await window.electronAPI.file.saveAs(data)
    if (result.success && result.filePath) {
      set({ filePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
    }
  },

  saveDocumentAs: async () => {
    const data = get().getDocumentData()
    const result = await window.electronAPI.file.saveAs(data)
    if (result.success && result.filePath) {
      set({ filePath: result.filePath, isDirty: false })
      await window.electronAPI.file.addRecent(result.filePath)
    }
  }
}))
```

- [ ] **Step 2: Update InfiniteCanvas to sync elements with Fabric.js**

```typescript
// Add sync function to InfiniteCanvas
const syncElementsToCanvas = useCallback(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  // Clear canvas
  canvas.clear()

  // Render all elements
  const elements = useElementsStore.getState().elements
  elements.forEach((element) => {
    if (element.type === 'card') {
      const obj = renderCard(canvas, element)
      canvas.add(obj)
    } else if (element.type === 'rectangle') {
      const rect = new Rect({
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        stroke: element.strokeColor,
        strokeWidth: element.strokeWidth,
        fill: 'transparent',
        data: { id: element.id, type: 'rectangle' },
        selectable: !element.locked,
        lockMovementX: element.locked,
        lockMovementY: element.locked
      })
      canvas.add(rect)
    } else if (element.type === 'ellipse') {
      const ellipse = new Ellipse({
        left: element.position.x,
        top: element.position.y,
        rx: element.size.width / 2,
        ry: element.size.height / 2,
        stroke: element.strokeColor,
        strokeWidth: element.strokeWidth,
        fill: 'transparent',
        data: { id: element.id, type: 'ellipse' },
        selectable: !element.locked,
        lockMovementX: element.locked,
        lockMovementY: element.locked
      })
      canvas.add(ellipse)
    }
  })

  canvas.renderAll()
}, [])

// Call sync on element changes
useEffect(() => {
  syncElementsToCanvas()
}, [elements, syncElementsToCanvas])
```

- [ ] **Step 3: Add auto-save timer**

```typescript
// Add to InfiniteCanvas
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

useEffect(() => {
  if (!isDirty || !filePath) return

  // Reset timer on any interaction
  const resetTimer = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, 30000) // 30 seconds
  }

  window.addEventListener('canvas-interaction', resetTimer)
  return () => {
    window.removeEventListener('canvas-interaction', resetTimer)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }
}, [isDirty, filePath, saveDocument])
```

- [ ] **Step 4: Test save/load cycle**

Manual verification: Create elements, save file, reload, elements persist

- [ ] **Step 5: Commit**

```bash
git add src/renderer/stores/canvasStore.ts
git commit -m "feat: implement complete file persistence with auto-save"
```

---

## Chunk 9: Top Bar and Window Controls

### Task 10: Add TopBar with Document Name

**Files:**
- Create: `src/renderer/components/TopBar/TopBar.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Create TopBar component**

```typescript
// src/renderer/components/TopBar/TopBar.tsx
import { useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useSearchStore } from '../../stores/searchStore'

export function TopBar() {
  const { documentName, setDocumentName, isDirty } = useCanvasStore()
  const { open: openSearch } = useSearchStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(documentName)

  const handleNameClick = () => {
    setEditName(documentName)
    setIsEditing(true)
  }

  const handleNameSave = () => {
    setDocumentName(editName)
    setIsEditing(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 z-40">
      {/* Left: Menu button placeholder */}
      <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg">
        ≡
      </button>

      {/* Center: Document name */}
      <div className="flex-1 text-center">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="px-2 py-1 text-sm text-center outline-none border border-blue-500 rounded"
            autoFocus
          />
        ) : (
          <button
            onClick={handleNameClick}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
          >
            {documentName}
            {isDirty && <span className="ml-1 text-gray-400">*</span>}
          </button>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => openSearch()}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-sm"
          title="搜索 (Ctrl+F)"
        >
          🔍
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-sm"
          title="设置"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx to include TopBar**

```typescript
// App.tsx - modify
return (
  <div className="w-full h-full">
    <TopBar />
    <InfiniteCanvas />
  </div>
)
```

- [ ] **Step 3: Adjust canvas area to account for TopBar**

```typescript
// In InfiniteCanvas, add paddingTop to container
<div className="w-full h-full relative overflow-hidden pt-12">
```

- [ ] **Step 4: Test TopBar**

Manual verification: Document name displays, click to rename works

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/TopBar/
git commit -m "feat: add top bar with document name and actions"
```

---

## Chunk 10: Zoom Controls Component

### Task 11: Implement Zoom Controls Component

**Files:**
- Create: `src/renderer/components/ZoomControl/ZoomControl.tsx`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Create ZoomControl component**

```typescript
// src/renderer/components/ZoomControl/ZoomControl.tsx
interface ZoomControlProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControl({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 flex items-center gap-3">
      <button
        onClick={onZoomOut}
        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-lg text-lg transition-colors"
        title="缩小"
      >
        −
      </button>
      <div className="w-16 text-center text-sm font-medium">
        {zoom}%
      </div>
      <button
        onClick={onZoomIn}
        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-lg text-lg transition-colors"
        title="放大"
      >
        +
      </button>
      <div className="w-px h-5 bg-gray-300" />
      <button
        onClick={onReset}
        className="px-2 py-1 text-xs hover:bg-gray-200 rounded transition-colors"
        title="重置缩放"
      >
        reset
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update InfiniteCanvas to use ZoomControl**

```typescript
// Add to InfiniteCanvas
import { ZoomControl } from '../ZoomControl/ZoomControl'

// Replace inline zoom controls with:
<ZoomControl
  zoom={zoom}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onReset={resetZoom}
/>
```

- [ ] **Step 3: Position ZoomControl correctly**

```typescript
// In return JSX:
<div className="absolute bottom-8 right-8">
  <ZoomControl ... />
</div>
```

- [ ] **Step 4: Test zoom controls**

Manual verification: Zoom controls work, position is correct

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ZoomControl/
git commit -m "feat: implement zoom control component"
```

---

## Chunk 11: Final Integration and Build

### Task 12: Final Integration and Build Verification

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

- [ ] **Step 1: Verify all imports and wire up complete app**

```typescript
// App.tsx - final version
import { useEffect } from 'react'
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas'
import { TopBar } from './components/TopBar/TopBar'
import { useCanvasStore } from './stores/canvasStore'
import { electronAPI } from './types/electronAPI'

export default function App() {
  const { newDocument, loadDocument, saveDocument, saveDocumentAs } = useCanvasStore()

  useEffect(() => {
    electronAPI.onMenuNew(() => newDocument())
    electronAPI.onMenuOpen(() => loadDocument())
    electronAPI.onMenuSave(() => saveDocument())
    electronAPI.onMenuSaveAs(() => saveDocumentAs())
  }, [newDocument, loadDocument, saveDocument, saveDocumentAs])

  return (
    <div className="w-full h-full">
      <TopBar />
      <InfiniteCanvas />
    </div>
  )
}
```

- [ ] **Step 2: Test production build**

Run: `cd E:/otherCode/infinite_whiteboard && npm run build`
Expected: Build completes without errors, release folder contains .exe

- [ ] **Step 3: Run built application**

Manual verification: Application launches, shows blank canvas, toolbar visible

- [ ] **Step 4: Verify all acceptance criteria**

Based on design doc section 10:
- [ ] Application starts with blank canvas
- [ ] Double-click empty area creates text card
- [ ] Cards support drag and resize
- [ ] Toolbar appears at bottom center, floating above canvas
- [ ] Zoom controls at bottom right
- [ ] Save/load .whiteboard files works
- [ ] Ctrl+F opens search
- [ ] Canvas supports wheel zoom and Space+drag pan

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete infinite whiteboard application"
```

---

## Verification Checklist

- [ ] All npm dependencies installed
- [ ] Dev server starts without errors
- [ ] Canvas renders with grid background
- [ ] Pan with Space+drag works
- [ ] Zoom with Ctrl+scroll works
- [ ] Double-click creates card
- [ ] Card editing opens editor on double-click
- [ ] Toolbar displays at bottom center
- [ ] All shape tools create elements
- [ ] Right-click shows context menu
- [ ] Search panel opens with Ctrl+F
- [ ] Undo/redo works
- [ ] Save creates .whiteboard file
- [ ] Load restores document
- [ ] Production build succeeds
- [ ] Built .exe launches correctly

---

## Dependencies Between Tasks

1. **Chunk 1** must complete before all other chunks (project structure)
2. **Chunk 2** (Task 2, 3) must complete before Chunk 3
3. **Chunk 3** requires elements store from Chunk 2
4. **Chunk 4** requires toolbar component
5. **Chunk 5** requires toolbar
6. **Chunk 6** requires search store
7. **Chunk 7** requires elements store
8. **Chunk 8** requires all previous chunks
9. **Chunk 9** requires canvas store
10. **Chunk 10** requires zoom controls
11. **Chunk 11** is final verification

---

## File Summary

### New Files (40):
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- `tailwind.config.js`, `postcss.config.js`, `electron-builder.json`, `index.html`
- `src/main/index.ts`, `src/main/menu.ts`, `src/main/ipc.ts`
- `src/preload/index.ts`
- `src/renderer/main.tsx`, `src/renderer/App.tsx`
- `src/renderer/styles/index.css`
- `src/renderer/types/electronAPI.ts`, `src/renderer/types/card.ts`
- `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/elementsStore.ts`
- `src/renderer/stores/toolStore.ts`, `src/renderer/stores/searchStore.ts`
- `src/renderer/stores/historyStore.ts`
- `src/renderer/components/Canvas/InfiniteCanvas.tsx`
- `src/renderer/components/Canvas/useCanvasControls.ts`
- `src/renderer/components/Canvas/renderCard.ts`
- `src/renderer/components/Toolbar/Toolbar.tsx`
- `src/renderer/components/ContextMenu/ContextMenu.tsx`
- `src/renderer/components/SearchPanel/SearchPanel.tsx`
- `src/renderer/components/CardEditor/CardEditor.tsx`
- `src/renderer/components/TopBar/TopBar.tsx`
- `src/renderer/components/ZoomControl/ZoomControl.tsx`

### Modified Files:
- None initially - all are new files in greenfield project
