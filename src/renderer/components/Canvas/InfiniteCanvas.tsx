import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, FabricObject, Rect, Ellipse } from 'fabric'
import { useCanvasControls } from './useCanvasControls'
import { useElementsStore } from '../../stores/elementsStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useToolStore } from '../../stores/toolStore'
import { useSearchStore } from '../../stores/searchStore'
import { useHistoryStore } from '../../stores/historyStore'
import { renderCard } from './renderCard'
import { CardEditor } from '../CardEditor/CardEditor'
import { Toolbar } from '../Toolbar/Toolbar'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { SearchPanel } from '../SearchPanel/SearchPanel'
import { ZoomControl } from '../ZoomControl/ZoomControl'
import { CardElement } from '../../types/card'

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuHandlersRef = useRef<Record<string, () => void>>({})
  const menuHandlersRegisteredRef = useRef(false)
  const [zoom, setZoom] = useState(100)
  const [editingCard, setEditingCard] = useState<{
    id: string
    title: string
    content: string
    position: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    elementId: string
    isLocked: boolean
  } | null>(null)
  const elements = useElementsStore((s) => s.elements)
  const { currentTool, setTool } = useToolStore()
  const { addCard, saveDocument, newDocument, loadDocument, saveDocumentAs } = useCanvasStore()

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

  // Sync elements to Fabric canvas
  const syncElementsToCanvas = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.clear()

    elements.forEach((element) => {
      if (element.type === 'card') {
        const obj = renderCard(element) as FabricObject
        obj.set({
          left: element.position.x,
          top: element.position.y
        })
        ;(obj as any).data = { id: element.id, type: 'card' }
        obj.selectable = !element.locked
        obj.evented = !element.locked
        canvas.add(obj)
      } else if (element.type === 'rectangle') {
        const rect = new Rect({
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          stroke: element.strokeColor,
          strokeWidth: element.strokeWidth,
          fill: 'transparent'
        })
        ;(rect as any).data = { id: element.id, type: 'rectangle' }
        rect.selectable = !element.locked
        rect.evented = !element.locked
        canvas.add(rect)
      } else if (element.type === 'ellipse') {
        const ellipse = new Ellipse({
          left: element.position.x,
          top: element.position.y,
          rx: element.size.width / 2,
          ry: element.size.height / 2,
          stroke: element.strokeColor,
          strokeWidth: element.strokeWidth,
          fill: 'transparent'
        })
        ;(ellipse as any).data = { id: element.id, type: 'ellipse' }
        ellipse.selectable = !element.locked
        ellipse.evented = !element.locked
        canvas.add(ellipse)
      }
    })

    canvas.renderAll()
  }, [elements])

  useEffect(() => {
    syncElementsToCanvas()
  }, [syncElementsToCanvas])

  // Double-click to edit or create card
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      if (currentTool === 'card') {
        const pointer = canvas.getPointer(opt.e)
        const worldPoint = {
          x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
          y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
        }
        addCard(worldPoint.x, worldPoint.y)
        setTool('select')
        return
      }

      const target = canvas.findTarget(opt.e as any)
      if (target && (target as any).data?.type === 'card') {
        const cardEl = useElementsStore.getState().getElement((target as any).data.id) as CardElement
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
        const pointer = canvas.getPointer(opt.e)
        const worldPoint = {
          x: (pointer.x - canvas.viewportTransform[4]) / canvas.getZoom(),
          y: (pointer.y - canvas.viewportTransform[5]) / canvas.getZoom()
        }
        addCard(worldPoint.x, worldPoint.y)
      }
    }

    canvas.on('mouse:dblclick', handleDblClick)
    return () => { canvas.off('mouse:dblclick', handleDblClick) }
  }, [currentTool, addCard, setTool])

  // Handle shape creation on click
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      if (currentTool === 'select') return
      if (opt.target) return

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
        } as any)
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
        } as any)
        useElementsStore.getState().setSelected(id)
        setTool('select')
      }
    }

    canvas.on('mouse:down', handleClick as any)
    return () => { canvas.off('mouse:down', handleClick as any) }
  }, [currentTool, setTool])

  // Handle selection
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleSelection = (opt: { selected?: FabricObject[] }) => {
      if (opt.selected && opt.selected.length > 0) {
        const id = (opt.selected[0] as any).data?.id
        if (id) useElementsStore.getState().setSelected(id)
      }
    }

    const handleSelectionCleared = () => {
      useElementsStore.getState().setSelected(null)
    }

    canvas.on('selection:created', handleSelection as any)
    canvas.on('selection:updated', handleSelection as any)
    canvas.on('selection:cleared', handleSelectionCleared as any)

    return () => {
      canvas.off('selection:created', handleSelection as any)
      canvas.off('selection:updated', handleSelection as any)
      canvas.off('selection:cleared', handleSelectionCleared as any)
    }
  }, [])

  // Handle context menu
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onMouseDown = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      const e = opt.e as unknown as MouseEvent
      if (e.button === 2) {
        if (!opt.target) return
        const id = (opt.target as any).data?.id
        if (!id) return
        const element = useElementsStore.getState().getElement(id)
        if (element) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            elementId: id,
            isLocked: element.locked
          })
        }
      }
    }

    canvas.on('mouse:down', onMouseDown as any)
    return () => { canvas.off('mouse:down', onMouseDown as any) }
  }, [])

  // Handle card save
  const handleCardSave = useCallback((title: string, content: string) => {
    if (editingCard) {
      useElementsStore.getState().updateElement(editingCard.id, {
        title,
        content,
        updatedAt: new Date().toISOString()
      } as any)
      setEditingCard(null)
      useElementsStore.getState().setEditingCard(null)
      useCanvasStore.getState().setDirty(true)
    }
  }, [editingCard])

  const handleCardCancel = useCallback(() => {
    setEditingCard(null)
    useElementsStore.getState().setEditingCard(null)
  }, [])

  // Navigate canvas to show a specific card
  const navigateToCard = useCallback((cardId: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const card = useElementsStore.getState().getElement(cardId) as CardElement | undefined
    if (!card) return

    // Exit editing mode if active
    setEditingCard(null)
    useElementsStore.getState().setEditingCard(null)

    // Calculate center of the card in world coordinates
    const cardCenterX = card.position.x + card.size.width / 2
    const cardCenterY = card.position.y + card.size.height / 2

    // Get canvas center in viewport coordinates
    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = (window.innerHeight - 48) / 2 + 48 // Account for top bar

    // Get current zoom
    const currentZoom = canvas.getZoom()

    // Calculate the offset needed to center the card
    const vpt = canvas.viewportTransform!
    vpt[4] = viewportCenterX - cardCenterX * currentZoom
    vpt[5] = viewportCenterY - cardCenterY * currentZoom

    canvas.setViewportTransform(vpt)
    canvas.renderAll()

    // Select the card
    useElementsStore.getState().setSelected(cardId)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        useSearchStore.getState().open()
      }
      if (e.key === 'Escape') {
        useSearchStore.getState().close()
        setEditingCard(null)
        useElementsStore.getState().setEditingCard(null)
      }
      if (e.key === 'Delete' && !editingCard) {
        const selectedId = useElementsStore.getState().selectedId
        if (selectedId) {
          useElementsStore.getState().removeElement(selectedId)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const command = useHistoryStore.getState().undo()
        if (!command) return
        if (command.type === 'update' && command.elementId && command.previousState) {
          useElementsStore.getState().updateElement(command.elementId, command.previousState as any)
        } else if (command.type === 'delete' && command.elementId && command.previousState) {
          useElementsStore.getState().addElement(command.previousState as any)
        } else if (command.type === 'create' && command.elementId) {
          useElementsStore.getState().removeElement(command.elementId)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        const command = useHistoryStore.getState().redo()
        if (!command) return
        if (command.type === 'update' && command.elementId && command.newState) {
          useElementsStore.getState().updateElement(command.elementId, command.newState as any)
        } else if (command.type === 'delete' && command.elementId) {
          useElementsStore.getState().removeElement(command.elementId)
        } else if (command.type === 'create' && command.elementId && command.previousState) {
          useElementsStore.getState().addElement(command.previousState as any)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const selectedId = useElementsStore.getState().selectedId
        if (selectedId) {
          useElementsStore.getState().duplicateElement(selectedId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingCard])

  // Menu event handlers
  useEffect(() => {
    if (!window.electronAPI) return

    // Prevent duplicate registration (React StrictMode may double-mount)
    if (menuHandlersRegisteredRef.current) return
    menuHandlersRegisteredRef.current = true

    // Store handlers in ref so we can call the latest versions
    menuHandlersRef.current = {
      new: () => newDocument(),
      open: () => loadDocument(),
      save: () => saveDocument(),
      saveAs: () => saveDocumentAs(),
      search: () => useSearchStore.getState().open(),
      zoomIn: () => zoomIn(),
      zoomOut: () => zoomOut(),
      zoomReset: () => resetZoom()
    }

    const handlers = menuHandlersRef.current
    const api = window.electronAPI
    api.onMenuNew(() => handlers.new())
    api.onMenuOpen(() => handlers.open())
    api.onMenuSave(() => handlers.save())
    api.onMenuSaveAs(() => handlers.saveAs())
    api.onMenuSearch(() => handlers.search())
    api.onMenuZoomIn(() => handlers.zoomIn())
    api.onMenuZoomOut(() => handlers.zoomOut())
    api.onMenuZoomReset(() => handlers.zoomReset())
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      <div className="canvas-container absolute inset-0 pt-12">
        <canvas ref={canvasRef} />
      </div>
      {editingCard && (
        <CardEditor
          initialTitle={editingCard.title}
          initialContent={editingCard.content}
          position={editingCard.position}
          onSave={handleCardSave}
          onCancel={handleCardCancel}
        />
      )}
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
      <SearchPanel onNavigate={navigateToCard} />
      <Toolbar />
      <ZoomControl
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
      />
    </div>
  )
}
