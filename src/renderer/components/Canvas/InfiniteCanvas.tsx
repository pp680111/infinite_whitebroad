import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, FabricObject, Rect, Ellipse } from 'fabric'
import { useCanvasControls } from './useCanvasControls'
import { useElementsStore } from '../../stores/elementsStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useToolStore } from '../../stores/toolStore'
import { useSearchStore } from '../../stores/searchStore'
import { useHistoryStore } from '../../stores/historyStore'
import { renderCard, CardRenderResult } from './renderCard'
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
  const [isEditingCardId, setIsEditingCardId] = useState<string | null>(null)
  const isEditingCardIdRef = useRef<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    elementId: string
    isLocked: boolean
  } | null>(null)
  const elements = useElementsStore((s) => s.elements)
  const { currentTool, setTool } = useToolStore()
  const { addCard, saveDocument, newDocument, loadDocument, saveDocumentAs } = useCanvasStore()
  const fitCardToText = useCallback((cardId: string) => {
    const canvas = fabricRef.current
    if (!canvas) return null

    const objects = canvas.getObjects()
    let cardObject: any = undefined
    let titleText: any = undefined
    let contentText: any = undefined

    for (const obj of objects) {
      const o = obj as any
      if (o.data?.id === cardId && o.data?.type === 'card') {
        cardObject = o
      } else if (o.data?.cardId === cardId) {
        if (o.data?.isTitle) {
          titleText = o
        } else if (o.data?.isContent) {
          contentText = o
        }
      }
    }

    if (!cardObject || !contentText) return null

    if (titleText?.initDimensions) titleText.initDimensions()
    if (contentText?.initDimensions) contentText.initDimensions()

    const minCardWidth = 200
    const horizontalPadding = 20
    const titleTextWidth = titleText
      ? Math.max(
          titleText.dynamicMinWidth || 0,
          titleText.calcTextWidth ? titleText.calcTextWidth() : 0
        )
      : 0
    const contentTextWidth = Math.max(
      contentText.dynamicMinWidth || 0,
      contentText.calcTextWidth ? contentText.calcTextWidth() : 0
    )
    const nextWidth = Math.max(
      minCardWidth,
      Math.ceil(Math.max(titleTextWidth, contentTextWidth) + horizontalPadding)
    )
    const textWidth = Math.max(nextWidth - horizontalPadding, 40)

    if (titleText) {
      titleText.set({ width: textWidth })
      titleText.initDimensions?.()
      titleText.setCoords()
    }
    contentText.set({ width: textWidth })
    contentText.initDimensions?.()
    contentText.setCoords()

    const titleHeight = titleText ? titleText.height || 0 : 0
    const contentHeight = contentText.height || 0
    const nextHeight = Math.max(150, 30 + titleHeight + contentHeight + (titleText ? 25 : 0))

    cardObject.set({
      width: nextWidth,
      height: nextHeight,
      scaleX: 1,
      scaleY: 1
    })
    cardObject.setCoords()

    if (titleText) {
      titleText.set({
        left: cardObject.left + 10,
        top: cardObject.top + 10
      })
      titleText.setCoords()
    }
    contentText.set({
      left: cardObject.left + 10,
      top: cardObject.top + (titleText ? 35 : 10)
    })
    contentText.setCoords()

    canvas.requestRenderAll()

    return {
      title: titleText?.text || '',
      content: contentText?.text || '',
      size: {
        width: nextWidth,
        height: nextHeight
      }
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f5f5f5',
      selection: true,
      preserveObjectStacking: true
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
        const { cardObject, titleText, contentText } = renderCard(element, { isEditing: element.id === isEditingCardId }) as CardRenderResult
        // Add card background
        canvas.add(cardObject)
        // Add title if present
        if (titleText) {
          canvas.add(titleText)
        }
        // Add content text
        canvas.add(contentText)
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

  // Sync card state changes (position, size, content) to store
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const getCardTextboxes = (cardId: string) => {
      const allObjects = canvas.getObjects()
      let titleText: any = undefined
      let contentText: any = undefined

      for (const obj of allObjects) {
        const o = obj as any
        if (o.data?.cardId === cardId) {
          if (o.data?.isTitle) {
            titleText = o
          } else if (o.data?.isContent) {
            contentText = o
          }
        }
      }

      return { titleText, contentText }
    }

    const syncCardTextboxes = (target: any) => {
      if (!target?.data || target.data.type !== 'card') return null

      const cardId = target.data.id
      const { titleText, contentText } = getCardTextboxes(cardId)
      const scaledWidth = target.width * (target.scaleX || 1)
      const cardLeft = target.left
      const cardTop = target.top

      if (titleText) {
        titleText.set({
          left: cardLeft + 10,
          top: cardTop + 10,
          width: Math.max(scaledWidth - 20, 40)
        })
        titleText.setCoords()
      }

      if (contentText) {
        contentText.set({
          left: cardLeft + 10,
          top: cardTop + (titleText ? 35 : 10),
          width: Math.max(scaledWidth - 20, 40)
        })
        contentText.setCoords()
      }

      return { cardId, titleText, contentText }
    }

    const handleObjectMoving = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const synced = syncCardTextboxes(target)
      if (!synced) return

      canvas.requestRenderAll()
    }

    const handleObjectScaling = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const synced = syncCardTextboxes(target)
      if (!synced) return

      canvas.requestRenderAll()
    }

    const handleObjectModified = (e: { target?: FabricObject }) => {
      const target = e.target as any
      if (!target || !target.data || target.data.type !== 'card') return

      const cardId = target.data.id
      const currentElement = useElementsStore.getState().getElement(cardId)
      if (!currentElement || currentElement.type !== 'card') return

      // Build update object with all changed properties
      const updates: Record<string, any> = {}

      // Sync position
      const newPosition = {
        x: target.left,
        y: target.top
      }
      if (currentElement.position.x !== newPosition.x || currentElement.position.y !== newPosition.y) {
        updates.position = newPosition
      }

      // Sync size (for cards, width/height are stored in size)
      const newSize = {
        width: target.width * (target.scaleX || 1),
        height: target.height * (target.scaleY || 1)
      }
      if (currentElement.size.width !== newSize.width || currentElement.size.height !== newSize.height) {
        updates.size = newSize
        // Reset scale after applying to size
        target.set({
          width: newSize.width,
          height: newSize.height,
          scaleX: 1,
          scaleY: 1
        })
      }

      const synced = syncCardTextboxes(target)
      const titleText = synced?.titleText
      const contentText = synced?.contentText

      // Sync content from textboxes
      const title = titleText?.text || ''
      const content = contentText?.text || ''

      if (currentElement.title !== title || currentElement.content !== content) {
        updates.title = title
        updates.content = content
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString()
        useElementsStore.getState().updateElement(cardId, updates as any)
        useCanvasStore.getState().setDirty(true)
      }
    }

    canvas.on('object:moving', handleObjectMoving)
    canvas.on('object:scaling', handleObjectScaling)
    canvas.on('object:modified', handleObjectModified)
    return () => {
      canvas.off('object:moving', handleObjectMoving)
      canvas.off('object:scaling', handleObjectScaling)
      canvas.off('object:modified', handleObjectModified)
    }
  }, [])

  // Sync isEditingCardIdRef with isEditingCardId state
  useEffect(() => {
    isEditingCardIdRef.current = isEditingCardId
  }, [isEditingCardId])

  // Double-click to edit or create card
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      if (currentTool === 'card') {
        const scenePoint = canvas.getScenePoint(opt.e)
        addCard(scenePoint.x, scenePoint.y)
        setTool('select')
        return
      }

      const target = canvas.findTarget(opt.e as any)
      if (target && (target as any).data?.type === 'card') {
        const cardEl = useElementsStore.getState().getElement((target as any).data.id) as CardElement
        if (cardEl && !cardEl.locked) {
          const cardId = cardEl.id
          setIsEditingCardId(cardId)
          useElementsStore.getState().setEditingCard(cardId)

          // Find the existing card's textboxes
          const objects = canvas.getObjects()
          let titleText: any = undefined
          let contentText: any = undefined
          for (const obj of objects) {
            const o = obj as any
            if (o.data?.cardId === cardId) {
              if (o.data?.isTitle) {
                titleText = o
              } else if (o.data?.isContent) {
                contentText = o
              }
            }
          }

          if (titleText || contentText) {
            // Clear any active selection to prevent interference
            canvas.discardActiveObject()

            // Enable editing on the textboxes without re-rendering
            if (titleText) {
              ;(titleText as any).editable = true
              titleText.enterEditing()
              // Position cursor at end of text
              const titleLen = titleText.text?.length || 0
              titleText.setSelectionStart(titleLen)
              titleText.setSelectionEnd(titleLen)
            }
            if (contentText) {
              ;(contentText as any).editable = true
              // Clear placeholder text if it matches
              if (contentText.text === 'Double-click to edit') {
                contentText.text = ''
              }
              contentText.enterEditing()
              // Position cursor at end of text
              const contentLen = contentText.text?.length || 0
              contentText.setSelectionStart(contentLen)
              contentText.setSelectionEnd(contentLen)
            }
          }
        }
      } else if (!target) {
        // First, save the currently editing card if any
        const editingCardId = isEditingCardIdRef.current
        if (editingCardId) {
          const objects = canvas.getObjects()
          let titleTextbox: any = undefined
          let contentTextbox: any = undefined
          for (const obj of objects) {
            const o = obj as any
            if (o.data?.cardId === editingCardId) {
              if (o.data?.isTitle) {
                titleTextbox = o
              } else if (o.data?.isContent) {
                contentTextbox = o
              }
            }
          }

          if (titleTextbox || contentTextbox) {
            const fitted = fitCardToText(editingCardId)
            const title = fitted ? fitted.title : (titleTextbox?.text || '')
            const content = fitted ? fitted.content : (contentTextbox?.text || '')

            // Save to store
            useElementsStore.getState().updateElement(editingCardId, {
              title,
              content,
              ...(fitted ? { size: fitted.size } : {}),
              updatedAt: new Date().toISOString()
            } as any)

            // Disable editing on the textboxes
            if (titleTextbox) {
              ;(titleTextbox as any).editable = false
            }
            if (contentTextbox) {
              ;(contentTextbox as any).editable = false
            }

            setIsEditingCardId(null)
            useElementsStore.getState().setEditingCard(null)
            useCanvasStore.getState().setDirty(true)
          }
        }

        const scenePoint = canvas.getScenePoint(opt.e)
        addCard(scenePoint.x, scenePoint.y)
      }
    }

    canvas.on('mouse:dblclick', handleDblClick)
    return () => { canvas.off('mouse:dblclick', handleDblClick) }
  }, [currentTool, addCard, setTool, syncElementsToCanvas])

  // Handle shape creation on click
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      if (currentTool === 'select') return
      if (opt.target) return

      const scenePoint = canvas.getScenePoint(opt.e)

      if (currentTool === 'rectangle') {
        const id = useElementsStore.getState().addElement({
          type: 'rectangle',
          position: { x: scenePoint.x, y: scenePoint.y },
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
          position: { x: scenePoint.x, y: scenePoint.y },
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
  const saveEditingCard = useCallback((texts: { title?: string; content: string }) => {
    if (isEditingCardId) {
      const fitted = fitCardToText(isEditingCardId)

      // Save text content to store
      useElementsStore.getState().updateElement(isEditingCardId, {
        title: fitted ? fitted.title : texts.title,
        content: fitted ? fitted.content : texts.content,
        ...(fitted ? { size: fitted.size } : {}),
        updatedAt: new Date().toISOString()
      } as any)

      // Disable editing on the textboxes without re-rendering
      const canvas = fabricRef.current
      if (canvas) {
        const objects = canvas.getObjects()
        for (const obj of objects) {
          const o = obj as any
          if (o.data?.cardId === isEditingCardId) {
            if (o.data?.isTitle || o.data?.isContent) {
              ;(o as any).editable = false
            }
          }
        }
      }

      setIsEditingCardId(null)
      useElementsStore.getState().setEditingCard(null)
      useCanvasStore.getState().setDirty(true)
    }
  }, [fitCardToText, isEditingCardId])

  const cancelEditingCard = useCallback(() => {
    // Disable editing on the textboxes without re-rendering
    const canvas = fabricRef.current
    if (canvas) {
      const objects = canvas.getObjects()
      for (const obj of objects) {
        const o = obj as any
        if (o.data?.cardId === isEditingCardId) {
          if (o.data?.isTitle || o.data?.isContent) {
            ;(o as any).editable = false
          }
        }
      }
    }

    setIsEditingCardId(null)
    useElementsStore.getState().setEditingCard(null)
  }, [isEditingCardId])

  // Handle text editing completion
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleTextChanged = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const cardId = target?.data?.cardId
      if (!cardId) return

      const fitted = fitCardToText(cardId)
      if (!fitted) return

      useCanvasStore.getState().setDirty(true)
    }

    const handleEditingExited = () => {
      const currentEditingId = isEditingCardIdRef.current
      if (!currentEditingId) return

      const objects = canvas.getObjects()
      let titleTextbox: any = undefined
      let contentTextbox: any = undefined
      for (const obj of objects) {
        const o = obj as any
        if (o.data?.cardId === currentEditingId) {
          if (o.data?.isTitle) {
            titleTextbox = o
          } else if (o.data?.isContent) {
            contentTextbox = o
          }
        }
      }

      if (!titleTextbox && !contentTextbox) return

      const fitted = fitCardToText(currentEditingId)
      const title = fitted ? fitted.title : (titleTextbox?.text || '')
      const content = fitted ? fitted.content : (contentTextbox?.text || '')

      // Always save when editing exits, regardless of what was clicked
      useElementsStore.getState().updateElement(currentEditingId, {
        title,
        content,
        ...(fitted ? { size: fitted.size } : {}),
        updatedAt: new Date().toISOString()
      } as any)

      // Disable editing on textboxes
      if (titleTextbox) {
        ;(titleTextbox as any).editable = false
      }
      if (contentTextbox) {
        ;(contentTextbox as any).editable = false
      }

      // Clear editing state
      setIsEditingCardId(null)
      useElementsStore.getState().setEditingCard(null)
      useCanvasStore.getState().setDirty(true)

      // Reset canvas state to allow card selection and dragging
      canvas.discardActiveObject()
      canvas.set('selection', true)
      canvas.defaultCursor = 'default'
      canvas.hoverCursor = 'move'
      canvas.renderAll()
    }

    const handleMouseDown = (e: { target?: FabricObject; e: MouseEvent }) => {
      const currentEditingId = isEditingCardIdRef.current
      if (!currentEditingId) return

      const target = e.target as any

      // Don't interfere with text editing clicks on the editing card's textboxes
      if (target && (target.type === 'textbox' || target.type === 'i-text')) return

      // Find the editing card's textboxes
      const objects = canvas.getObjects()
      let titleTextbox: any = undefined
      let contentTextbox: any = undefined
      for (const obj of objects) {
        const o = obj as any
        if (o.data?.cardId === currentEditingId) {
          if (o.data?.isTitle) {
            titleTextbox = o
          } else if (o.data?.isContent) {
            contentTextbox = o
          }
        }
      }

      if (!titleTextbox && !contentTextbox) return

      // Get the current text from textboxes
      const fitted = fitCardToText(currentEditingId)
      const title = fitted ? fitted.title : (titleTextbox?.text || '')
      const content = fitted ? fitted.content : (contentTextbox?.text || '')

      // Save content to store
      useElementsStore.getState().updateElement(currentEditingId, {
        title,
        content,
        ...(fitted ? { size: fitted.size } : {}),
        updatedAt: new Date().toISOString()
      } as any)
      useCanvasStore.getState().setDirty(true)

      // Exit editing mode on textboxes
      if (titleTextbox) {
        ;(titleTextbox as any).editable = false
      }
      if (contentTextbox) {
        ;(contentTextbox as any).editable = false
      }

      // Clear editing state
      setIsEditingCardId(null)
      useElementsStore.getState().setEditingCard(null)
    }

    ;(canvas.on as any)('text:changed', handleTextChanged)
    ;(canvas.on as any)('textbox:editing:exited', handleEditingExited)
    ;(canvas.on as any)('mouse:down', handleMouseDown)
    return () => {
      ;(canvas.off as any)('text:changed', handleTextChanged)
      ;(canvas.off as any)('textbox:editing:exited', handleEditingExited)
      ;(canvas.off as any)('mouse:down', handleMouseDown)
    }
  }, [fitCardToText, isEditingCardId, saveEditingCard])

  // Navigate canvas to show a specific card
  const navigateToCard = useCallback((cardId: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const card = useElementsStore.getState().getElement(cardId) as CardElement | undefined
    if (!card) return

    // Exit editing mode if active
    setIsEditingCardId(null)
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
        cancelEditingCard()
      }
      if (e.key === 'Delete' && !isEditingCardId) {
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
  }, [isEditingCardId, cancelEditingCard])

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
