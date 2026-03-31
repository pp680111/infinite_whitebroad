# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An infinite canvas Electron app for personal knowledge card collection. Users can create, edit, and arrange cards with titles, rich text content, and images on an infinitely pannable/zoomable canvas.

## Tech Stack

- **Electron 28** — desktop app framework
- **React 18** + **TypeScript** — UI
- **Vite 5** — bundler with `vite-plugin-electron`
- **Fabric.js 6** — canvas rendering (shapes, textboxes, images)
- **Zustand 4** — state management
- **Tailwind CSS 3** — styling

## Build Commands

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Production build (TypeScript compile + Vite build + electron-builder)
npm run preview  # Preview production build locally
```

## Architecture

```
src/
├── main/           # Electron main process
│   ├── index.ts    # App entry, window creation
│   ├── menu.ts     # Application menu setup
│   └── ipc.ts      # IPC handlers (file dialogs, recent files)
├── preload/        # Context bridge
│   └── index.ts    # Exposes electronAPI to renderer
└── renderer/       # React frontend
    ├── App.tsx
    ├── components/
    │   ├── Canvas/
    │   │   ├── InfiniteCanvas.tsx   # Main canvas orchestrator (~1100 lines)
    │   │   ├── useCanvasControls.ts # Pan, zoom, space-drag
    │   │   └── renderCard.ts        # Fabric object creation for cards
    │   ├── Toolbar/Toolbar.tsx
    │   ├── TopBar/TopBar.tsx
    │   ├── SearchPanel/SearchPanel.tsx
    │   ├── ContextMenu/ContextMenu.tsx
    │   └── ZoomControl/ZoomControl.tsx
    ├── stores/
    │   ├── canvasStore.ts    # Document state (name, file, viewport, save/load)
    │   ├── elementsStore.ts # All canvas elements (cards, images)
    │   ├── toolStore.ts     # Current tool selection
    │   ├── searchStore.ts   # Search panel open/close
    │   └── historyStore.ts  # Undo/redo commands
    └── types/
        └── card.ts          # CanvasElement, CardElement, ImageElement interfaces
```

## Key Patterns

### Canvas Element Model
Elements are stored in `elementsStore` as plain objects (`CanvasElement`). The Fabric.js canvas is a **rendering layer only** — the store is the source of truth. `InfiniteCanvas.tsx` syncs elements → Fabric objects on every store change via `useEffect`.

### Card Editing Flow
Double-click a card → `isEditingCardId` state → Fabric textboxes become editable (`enterEditing()`). Exiting edit (click outside, `Escape`, or `textbox:editing:exited`) → content saved back to `elementsStore`.

### Document Format
Documents are JSON with structure: `{ version, metadata: { name, createdAt, updatedAt, viewport }, canvasState: { elements }, searchIndex }`. Saved via `electron-store` IPC calls to the main process.

### Viewport
Viewport state (`{ x, y, zoom }`) lives in `canvasStore`. Zoom is stored as percentage (100 = 1.0). The Fabric canvas viewport transform handles pan/zoom.

### Coordinate System
Card positions stored in world coordinates. `scenePoint` converts from screen to world coordinates. Zoom affects Fabric's `getScenePoint` calculations. Recent commit `ae7524d` fixed coordinate issues at non-100% zoom levels.

### Context Menu
Right-click on a card shows `ContextMenu` with Delete, Duplicate, Bring to Front, Send to Back, Lock/Unlock options. `InfiniteCanvas.tsx` listens for right-click via `mouse:down` with `button === 2`.

### Search
Full-text search across card titles and content (HTML stripped). `SearchPanel` uses `navigateToCard` to pan canvas to center on found card.

## Keyboard Shortcuts

- `Ctrl+F` — Open search
- `Escape` — Close search / cancel card editing
- `Delete` — Delete selected card (when not editing)
- `Ctrl+D` — Duplicate selected card
- `Ctrl+Z` — Undo
- `Ctrl+Y` — Redo
- `Space+Drag` — Pan canvas
- `Scroll` — Zoom in/out

## Common Bugs

- **Coordinate mismatch at non-100% zoom**: If card positions appear wrong at zoom ≠ 100%, check `getScenePoint` usage in `InfiniteCanvas.tsx` and `layoutCardObjects`. Recent fix in `ae7524d`.
- **Text editing state leaking**: `isEditingCardIdRef` tracks the editing card without causing re-renders, preventing stale closures in event handlers.
- **Image paste during edit**: Clipboard paste listener uses `isEditingCardIdRef.current` to determine target card, not `isEditingCardId` state directly.
