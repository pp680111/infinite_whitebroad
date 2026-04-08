import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, FabricObject, FabricImage, Textbox } from 'fabric'
import { useCanvasControls } from './useCanvasControls'
import { useElementsStore } from '../../stores/elementsStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { useToolStore } from '../../stores/toolStore'
import { useSearchStore } from '../../stores/searchStore'
import { useHistoryStore, Command } from '../../stores/historyStore'
import { renderCard, CardRenderResult } from './renderCard'
import { Toolbar } from '../Toolbar/Toolbar'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { SearchPanel } from '../SearchPanel/SearchPanel'
import { ZoomControl } from '../ZoomControl/ZoomControl'
import { CardElement, CanvasElement } from '../../types/card'

const DEBUG_CONTEXT_MENU = false

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuHandlersRef = useRef<Record<string, () => void>>({})
  const menuHandlersRegisteredRef = useRef(false)
  const renderVersionRef = useRef(0)
  const skipNextSyncRef = useRef(false)
  const ignoreNextEditMouseDownRef = useRef(false)
  const handlingObjectModifiedRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const isPointerTransformingRef = useRef(false)
  const hoveredCardIdRef = useRef<string | null>(null)
  const activeSelectionDragSessionRef = useRef<{
    target: any
    cardIds: Set<string>
    previousPoint: { x: number; y: number }
    totalDx: number
    totalDy: number
  } | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isEditingCardId, setIsEditingCardId] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'done' | null>(null)
  const autoSaveToastTimerRef = useRef<number | null>(null)
  const isEditingCardIdRef = useRef<string | null>(null)
  const lastPointerClientRef = useRef<{ x: number; y: number } | null>(null)
  const copiedCardRef = useRef<Omit<CardElement, 'id'> | null>(null)
  const pasteCountRef = useRef(0)
  const [hasCopiedCard, setHasCopiedCard] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    elementId: string | null
    isLocked: boolean
  } | null>(null)
  const elements = useElementsStore((s) => s.elements)
  const { currentTool, setTool } = useToolStore()
  const {
    addCard,
    saveDocument,
    newDocument,
    loadDocument,
    loadLastOpenedDocument,
    saveDocumentAs,
    autoSaveDocument
  } = useCanvasStore()
  const addImageToCard = useElementsStore((s) => s.addImageToCard)
  const removeImageFromCard = useElementsStore((s) => s.removeImageFromCard)
  const isActiveSelectionType = useCallback((value: unknown) => {
    return typeof value === 'string' && value.toLowerCase() === 'activeselection'
  }, [])
  const getCardBounds = useCallback((cardObject: any) => {
    if (!cardObject) return null

    if (typeof cardObject.getCoords === 'function') {
      const coords = cardObject.getCoords()
      if (Array.isArray(coords) && coords.length > 0) {
        const xs = coords
          .map((point: any) => point?.x)
          .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value))
        const ys = coords
          .map((point: any) => point?.y)
          .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value))
        if (xs.length > 0 && ys.length > 0) {
          const left = Math.min(...xs)
          const top = Math.min(...ys)
          return {
            left,
            top,
            width: Math.max(1, Math.max(...xs) - left),
            height: Math.max(1, Math.max(...ys) - top)
          }
        }
      }
    }

    const left = typeof cardObject.left === 'number' ? cardObject.left : 0
    const top = typeof cardObject.top === 'number' ? cardObject.top : 0
    const scaleX = typeof cardObject.scaleX === 'number' ? cardObject.scaleX : 1
    const scaleY = typeof cardObject.scaleY === 'number' ? cardObject.scaleY : 1
    const width = typeof cardObject.width === 'number' ? cardObject.width * scaleX : 1
    const height = typeof cardObject.height === 'number' ? cardObject.height * scaleY : 1

    return {
      left,
      top,
      width: Math.max(1, width),
      height: Math.max(1, height)
    }
  }, [])
  const sanitizeBounds = useCallback((bounds?: { left: number; top: number; width: number; height: number } | null) => {
    if (!bounds) return null
    const values = [bounds.left, bounds.top, bounds.width, bounds.height]
    if (values.some((value) => !Number.isFinite(value))) return null
    return {
      left: bounds.left,
      top: bounds.top,
      width: Math.max(40, bounds.width),
      height: Math.max(40, bounds.height)
    }
  }, [])
  const getDragAnchorPoint = useCallback((target: any) => {
    if (target && typeof target.getCenterPoint === 'function') {
      const center = target.getCenterPoint()
      if (
        center &&
        typeof (center as any).x === 'number' &&
        typeof (center as any).y === 'number' &&
        Number.isFinite((center as any).x) &&
        Number.isFinite((center as any).y)
      ) {
        return { x: (center as any).x, y: (center as any).y }
      }
    }
    const x = typeof target?.left === 'number' && Number.isFinite(target.left) ? target.left : 0
    const y = typeof target?.top === 'number' && Number.isFinite(target.top) ? target.top : 0
    return { x, y }
  }, [])
  const createActiveSelectionDragSession = useCallback((target: any, entries: Array<{ cardId: string; cardObject: any }>) => {
    const cardIds = new Set<string>()
    const previousPoint = getDragAnchorPoint(target)
    for (const entry of entries) {
      cardIds.add(entry.cardId)
    }

    activeSelectionDragSessionRef.current = {
      target,
      cardIds,
      previousPoint,
      totalDx: 0,
      totalDy: 0
    }
  }, [getDragAnchorPoint])
  const cloneElement = useCallback(<T,>(value: T): T => {
    if (typeof structuredClone === 'function') {
      return structuredClone(value)
    }
    return JSON.parse(JSON.stringify(value)) as T
  }, [])
  const applyCommandUndo = useCallback((command: Command) => {
    const elementsStore = useElementsStore.getState()
    if (command.type === 'update' && command.elementId && command.previousState) {
      elementsStore.updateElement(command.elementId, command.previousState as any)
      useCanvasStore.getState().setDirty(true)
      return
    }
    if (command.type === 'delete' && command.previousState) {
      const restoredElement = cloneElement(command.previousState as CanvasElement)
      elementsStore.insertElement(restoredElement)
      if (restoredElement.id) {
        elementsStore.setSelected(restoredElement.id)
      }
      useCanvasStore.getState().setDirty(true)
      return
    }
    if (command.type === 'create' && command.elementId) {
      elementsStore.removeElement(command.elementId)
      useCanvasStore.getState().setDirty(true)
    }
  }, [cloneElement])
  const applyCommandRedo = useCallback((command: Command) => {
    const elementsStore = useElementsStore.getState()
    if (command.type === 'update' && command.elementId && command.newState) {
      elementsStore.updateElement(command.elementId, command.newState as any)
      useCanvasStore.getState().setDirty(true)
      return
    }
    if (command.type === 'delete' && command.previousState) {
      const deletedId = command.previousState.id || command.elementId
      if (!deletedId) return
      elementsStore.removeElement(deletedId)
      useCanvasStore.getState().setDirty(true)
      return
    }
    if (command.type === 'create' && command.previousState) {
      const recreatedElement = cloneElement(command.previousState as CanvasElement)
      elementsStore.insertElement(recreatedElement)
      if (recreatedElement.id) {
        elementsStore.setSelected(recreatedElement.id)
      }
      useCanvasStore.getState().setDirty(true)
    }
  }, [cloneElement])
  const executeUndo = useCallback(() => {
    const command = useHistoryStore.getState().undo()
    if (!command) return
    isApplyingHistoryRef.current = true
    try {
      applyCommandUndo(command)
      skipNextSyncRef.current = false
    } finally {
      isApplyingHistoryRef.current = false
    }
  }, [applyCommandUndo])
  const executeRedo = useCallback(() => {
    const command = useHistoryStore.getState().redo()
    if (!command) return
    isApplyingHistoryRef.current = true
    try {
      applyCommandRedo(command)
      skipNextSyncRef.current = false
    } finally {
      isApplyingHistoryRef.current = false
    }
  }, [applyCommandRedo])
  const layoutCardObjects = useCallback((
    cardId: string,
    options?: { fitTextWidth?: boolean; resizeHeight?: boolean; recalculateText?: boolean },
    overrideCardObject?: any,
    overrideBounds?: { left: number; top: number; width: number; height: number }
  ) => {
    const canvas = fabricRef.current
    if (!canvas) return null

    const objects = canvas.getObjects()
    let cardObject: any = undefined
    let titleText: any = undefined
    let contentText: any = undefined
    const imageObjects: any[] = []
    const imageDeleteButtons: any[] = []

    for (const obj of objects) {
      const o = obj as any
      if (o.data?.id === cardId && o.data?.type === 'card') {
        cardObject = o
      } else if (o.data?.cardId === cardId) {
        if (o.data?.isTitle) {
          titleText = o
        } else if (o.data?.isContent) {
          contentText = o
        } else if (o.data?.isCardImage) {
          imageObjects.push(o)
        } else if (o.data?.isCardImageDelete) {
          imageDeleteButtons.push(o)
        }
      }
    }

    const resolvedCardObject = overrideCardObject ?? cardObject
    if (!resolvedCardObject || !contentText) return null

    const shouldRecalculateText = options?.recalculateText ?? true
    if (shouldRecalculateText) {
      if (titleText?.initDimensions) titleText.initDimensions()
      if (contentText?.initDimensions) contentText.initDimensions()
    }

    let resolvedBounds = sanitizeBounds(overrideBounds ?? getCardBounds(resolvedCardObject))
    if (!resolvedBounds) return null

    if (options?.fitTextWidth) {
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

      resolvedCardObject.set({
        width: nextWidth,
        scaleX: 1
      })
      resolvedCardObject.setCoords()
      resolvedBounds = sanitizeBounds(getCardBounds(resolvedCardObject)) ?? {
        ...resolvedBounds,
        width: nextWidth
      }
    }

    const cardLeft = resolvedBounds.left
    const cardTop = resolvedBounds.top
    const innerWidth = Math.max(resolvedBounds.width - 20, 40)
    let currentTop = cardTop + 10

    if (titleText) {
      titleText.set({
        width: innerWidth,
        left: cardLeft + 10,
        top: currentTop
      })
      if (shouldRecalculateText) {
        titleText.initDimensions?.()
      }
      titleText.setCoords()
      currentTop += (titleText.height || 0) + 8
    }

    contentText.set({
      width: innerWidth,
      left: cardLeft + 10,
      top: currentTop
    })
    if (shouldRecalculateText) {
      contentText.initDimensions?.()
    }
    contentText.setCoords()
    currentTop += contentText.height || 0

    if (imageObjects.length > 0) {
      currentTop += 12
    }

    const orderedImages = imageObjects.sort((a, b) => (a.data?.imageIndex || 0) - (b.data?.imageIndex || 0))
    for (const imageObject of orderedImages) {
      const originalWidth = imageObject.data?.naturalWidth || imageObject.width || innerWidth
      const originalHeight = imageObject.data?.naturalHeight || imageObject.height || innerWidth
      const scale = Math.min(1, innerWidth / originalWidth)
      const renderHeight = originalHeight * scale

      imageObject.set({
        left: cardLeft + 10,
        top: currentTop,
        scaleX: scale,
        scaleY: scale
      })
      imageObject.setCoords()

       const deleteButton = imageDeleteButtons.find((button) => button.data?.imageId === imageObject.data?.imageId)
       if (deleteButton) {
        deleteButton.set({
          left: cardLeft + 10 + innerWidth - 18,
          top: currentTop + 6
        })
        deleteButton.setCoords()
      }

      currentTop += renderHeight + 8
    }

    const nextHeight = Math.max(150, currentTop - cardTop + 10 - (orderedImages.length > 0 ? 8 : 0))
    if (options?.resizeHeight) {
      resolvedCardObject.set({
        height: nextHeight,
        scaleY: 1
      })
      resolvedCardObject.setCoords()
    }

    canvas.requestRenderAll()

    return {
      title: titleText?.text || '',
      content: contentText?.text || '',
      size: {
        width: resolvedBounds.width,
        height: options?.resizeHeight ? nextHeight : resolvedBounds.height
      }
    }
  }, [getCardBounds, sanitizeBounds])
  const fitCardToText = useCallback((cardId: string) => {
    return layoutCardObjects(cardId, { fitTextWidth: true, resizeHeight: true })
  }, [layoutCardObjects])
  const findCardTextboxes = useCallback((cardId: string) => {
    const canvas = fabricRef.current
    if (!canvas) {
      return {
        titleTextbox: undefined as any,
        contentTextbox: undefined as any
      }
    }

    const objects = canvas.getObjects()
    let titleTextbox: any = undefined
    let contentTextbox: any = undefined
    for (const obj of objects) {
      const o = obj as any
      if (o.data?.cardId !== cardId) continue
      if (o.data?.isTitle) {
        titleTextbox = o
      } else if (o.data?.isContent) {
        contentTextbox = o
      }
    }

    return { titleTextbox, contentTextbox }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f5f5f5',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      fireRightClick: true,
      stopContextMenu: true,
      // Corner handles resize card width/height independently by default.
      // Hold Shift to keep aspect ratio when needed.
      uniformScaling: false,
      uniScaleKey: 'shiftKey'
    })
    if (DEBUG_CONTEXT_MENU) {
      console.log('[ctx-debug] canvas init', {
        fireRightClick: (canvas as any).fireRightClick,
        stopContextMenu: (canvas as any).stopContextMenu
      })
    }
    fabricRef.current = canvas

    // Keep a native trace to verify whether right click reaches the canvas DOM layer.
    const upperCanvasEl = (canvas as any).upperCanvasEl as HTMLCanvasElement | undefined
    const rememberPointer = (evt: MouseEvent) => {
      lastPointerClientRef.current = { x: evt.clientX, y: evt.clientY }
    }
    const nativeContextMenuLogger = (evt: MouseEvent) => {
      if (!DEBUG_CONTEXT_MENU) return
      console.log('[ctx-debug] native contextmenu', {
        button: evt.button,
        x: evt.clientX,
        y: evt.clientY,
        targetTag: (evt.target as HTMLElement | null)?.tagName
      })
    }
    const nativeMouseDownLogger = (evt: MouseEvent) => {
      rememberPointer(evt)
      if (!DEBUG_CONTEXT_MENU) return
      console.log('[ctx-debug] native mousedown', {
        button: evt.button,
        x: evt.clientX,
        y: evt.clientY
      })
    }
    const nativeMouseMoveTracker = (evt: MouseEvent) => {
      rememberPointer(evt)
    }
    upperCanvasEl?.addEventListener('contextmenu', nativeContextMenuLogger)
    upperCanvasEl?.addEventListener('mousedown', nativeMouseDownLogger)
    upperCanvasEl?.addEventListener('mousemove', nativeMouseMoveTracker)

    const handleResize = () => {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight })
      canvas.renderAll()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      upperCanvasEl?.removeEventListener('contextmenu', nativeContextMenuLogger)
      upperCanvasEl?.removeEventListener('mousedown', nativeMouseDownLogger)
      upperCanvasEl?.removeEventListener('mousemove', nativeMouseMoveTracker)
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

    const onMouseDown = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      const noSelectedElement = !useElementsStore.getState().selectedId
      const clickOnBlank = !opt.target
      const allowDirectPan = currentTool !== 'select' && noSelectedElement && clickOnBlank
      startPan(opt.e, allowDirectPan)
    }
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
  }, [currentTool, handleWheel, startPan, updatePan, endPan])

  // Sync elements to Fabric canvas
  const syncElementsToCanvas = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }

    const renderVersion = ++renderVersionRef.current
    canvas.clear()
    const pendingImageLoads: Promise<void>[] = []

    elements.forEach((element) => {
      if (element.type === 'card') {
        const card = element as CardElement
        const { cardObject, titleText, contentText } = renderCard(element, { isEditing: false }) as CardRenderResult
        // Add card background
        canvas.add(cardObject)
        // Add title if present
        if (titleText) {
          canvas.add(titleText)
        }
        // Add content text
        canvas.add(contentText)

        pendingImageLoads.push((async () => {
          for (const [imageIndex, image] of card.images.entries()) {
            try {
              const imageObject = await FabricImage.fromURL(image.src)
              if (renderVersion !== renderVersionRef.current) {
                return
              }

              imageObject.set({
                left: card.position.x + 10,
                top: card.position.y + 10,
                selectable: false,
                evented: false,
                hoverCursor: 'default'
              })
              ;(imageObject as any).data = {
                cardId: card.id,
                imageId: image.id,
                imageIndex,
                isCardImage: true,
                naturalWidth: imageObject.width,
                naturalHeight: imageObject.height
              }
              canvas.add(imageObject)

            } catch (error) {
              console.warn('Failed to load card image', error)
            }
          }

          if (renderVersion === renderVersionRef.current) {
            layoutCardObjects(card.id, { resizeHeight: false })
          }
        })())
      }
    })

    canvas.renderAll()
    await Promise.all(pendingImageLoads)
    if (renderVersion === renderVersionRef.current) {
      canvas.renderAll()
    }
  }, [elements, layoutCardObjects])

  useEffect(() => {
    void loadLastOpenedDocument()
  }, [loadLastOpenedDocument])

  useEffect(() => {
    void syncElementsToCanvas()
  }, [syncElementsToCanvas])

  // Auto-save every 10 seconds.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const dirty = useCanvasStore.getState().isDirty
      if (!dirty) return

      if (autoSaveToastTimerRef.current) {
        window.clearTimeout(autoSaveToastTimerRef.current)
        autoSaveToastTimerRef.current = null
      }

      setAutoSaveStatus('saving')
      void (async () => {
        const saved = await autoSaveDocument()
        if (!saved) {
          setAutoSaveStatus(null)
          return
        }

        setAutoSaveStatus('done')
        autoSaveToastTimerRef.current = window.setTimeout(() => {
          setAutoSaveStatus(null)
          autoSaveToastTimerRef.current = null
        }, 1600)
      })()
    }, 10000)

    return () => {
      window.clearInterval(timer)
      if (autoSaveToastTimerRef.current) {
        window.clearTimeout(autoSaveToastTimerRef.current)
        autoSaveToastTimerRef.current = null
      }
    }
  }, [autoSaveDocument])

  // Sync card state changes (position, size, content) to store
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const getCardEntriesFromTarget = (target: any): Array<{ cardId: string; cardObject: any }> => {
      if (!target) return []
      if (target.data?.type === 'card' && target.data?.id) {
        return [{ cardId: target.data.id as string, cardObject: target }]
      }

      if (isActiveSelectionType(target.type) && typeof target.getObjects === 'function') {
        const entries = target
          .getObjects()
          .map((obj: any) => (
            obj?.data?.type === 'card' && obj?.data?.id
              ? { cardId: obj.data.id as string, cardObject: obj }
              : null
          ))
          .filter((entry: { cardId: string; cardObject: any } | null): entry is { cardId: string; cardObject: any } => Boolean(entry))
        const seen = new Set<string>()
        return entries.filter((entry: { cardId: string; cardObject: any }) => {
          if (seen.has(entry.cardId)) return false
          seen.add(entry.cardId)
          return true
        })
      }

      return []
    }
    const getActiveSelectionTarget = (target: any) => {
      if (!target) return null
      if (isActiveSelectionType(target.type)) return target
      const group = target.group
      if (isActiveSelectionType(group?.type)) return group
      return null
    }
    const getCardEntriesForInteraction = (target: any): Array<{ cardId: string; cardObject: any }> => {
      const activeSelectionTarget = getActiveSelectionTarget(target)
      if (activeSelectionTarget) {
        return getCardEntriesFromTarget(activeSelectionTarget)
      }
      return getCardEntriesFromTarget(target)
    }

    const handleObjectMoving = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const activeSelectionTarget = getActiveSelectionTarget(target)
      const cardEntries = getCardEntriesForInteraction(target)
      if (cardEntries.length === 0) return
      const isActiveSelectionTransform = Boolean(activeSelectionTarget)
      if (
        isActiveSelectionTransform &&
        (
          !activeSelectionDragSessionRef.current ||
          activeSelectionDragSessionRef.current.target !== activeSelectionTarget
        )
      ) {
        createActiveSelectionDragSession(activeSelectionTarget, cardEntries)
      }

      if (isActiveSelectionTransform) {
        const session = activeSelectionDragSessionRef.current
        if (!session) return
        const point = getDragAnchorPoint(activeSelectionTarget)
        const frameDx = point.x - session.previousPoint.x
        const frameDy = point.y - session.previousPoint.y
        if (Number.isFinite(frameDx) && Number.isFinite(frameDy) && (frameDx !== 0 || frameDy !== 0)) {
          session.previousPoint = point
          session.totalDx += frameDx
          session.totalDy += frameDy
          const objects = canvas.getObjects()
          for (const obj of objects) {
            const o = obj as any
            const linkedCardId = o.data?.cardId as string | undefined
            if (!linkedCardId) continue
            if (!session.cardIds.has(linkedCardId)) continue

            const nextLeft = (typeof o.left === 'number' ? o.left : 0) + frameDx
            const nextTop = (typeof o.top === 'number' ? o.top : 0) + frameDy
            if (!Number.isFinite(nextLeft) || !Number.isFinite(nextTop)) continue
            o.set({
              left: nextLeft,
              top: nextTop
            })
            o.setCoords()
          }
        }
        canvas.requestRenderAll()
        return
      }

      for (const entry of cardEntries) {
        const bounds = sanitizeBounds(getCardBounds(entry.cardObject))
        if (!bounds) continue
        layoutCardObjects(
          entry.cardId,
          { resizeHeight: false, recalculateText: false },
          entry.cardObject,
          bounds
        )
      }

      canvas.requestRenderAll()
    }

    const handleObjectScaling = (e: { target?: FabricObject }) => {
      isPointerTransformingRef.current = true
      const target = e.target as any
      const cardEntries = getCardEntriesForInteraction(target)
      if (cardEntries.length === 0) return

      for (const entry of cardEntries) {
        const bounds = sanitizeBounds(getCardBounds(entry.cardObject))
        if (!bounds) continue
        layoutCardObjects(
          entry.cardId,
          { resizeHeight: false, recalculateText: false },
          entry.cardObject,
          bounds
        )
      }

      canvas.requestRenderAll()
    }

    const handleObjectModified = (e: { target?: FabricObject }) => {
      if (handlingObjectModifiedRef.current) return
      handlingObjectModifiedRef.current = true
      try {
        const target = e.target as any
        const activeSelectionTarget = getActiveSelectionTarget(target)
        const cardEntries = getCardEntriesForInteraction(target)
        if (cardEntries.length === 0) {
          return
        }

        let hasAnyUpdate = false
        const isActiveSelectionTransform = Boolean(activeSelectionTarget)
        const session = isActiveSelectionTransform ? activeSelectionDragSessionRef.current : null

        for (const entry of cardEntries) {
          const cardId = entry.cardId
          const cardObject = entry.cardObject
          const currentElement = useElementsStore.getState().getElement(cardId)
          if (!cardObject || !currentElement || currentElement.type !== 'card') continue
          const bounds = sanitizeBounds(getCardBounds(cardObject))
          if (!bounds) continue

          const updates: Record<string, any> = {}
          const movedBySession = Boolean(
            isActiveSelectionTransform &&
            session &&
            session.target === activeSelectionTarget &&
            session.cardIds.has(cardId)
          )
          const sessionDx = movedBySession ? session!.totalDx : 0
          const sessionDy = movedBySession ? session!.totalDy : 0
          const newPosition = {
            x: movedBySession ? currentElement.position.x + sessionDx : bounds.left,
            y: movedBySession ? currentElement.position.y + sessionDy : bounds.top
          }
          if (currentElement.position.x !== newPosition.x || currentElement.position.y !== newPosition.y) {
            updates.position = newPosition
          }

          const newSize = {
            width: bounds.width,
            height: bounds.height
          }
          if (currentElement.size.width !== newSize.width || currentElement.size.height !== newSize.height) {
            updates.size = newSize
            if (!isActiveSelectionTransform) {
              cardObject.set({
                width: newSize.width,
                height: newSize.height,
                scaleX: 1,
                scaleY: 1
              })
            }
          }

          const fitted = layoutCardObjects(cardId, { resizeHeight: false, recalculateText: true }, cardObject, bounds)
          const title = fitted?.title || ''
          const content = fitted?.content || ''
          if (currentElement.title !== title || currentElement.content !== content) {
            updates.title = title
            updates.content = content
          }

          if (Object.keys(updates).length > 0) {
            const previousState: Record<string, any> = {}
            const newState: Record<string, any> = {}
            for (const key of Object.keys(updates)) {
              previousState[key] = (currentElement as any)[key]
              newState[key] = updates[key]
            }
            updates.updatedAt = new Date().toISOString()
            previousState.updatedAt = currentElement.updatedAt
            newState.updatedAt = updates.updatedAt
            useElementsStore.getState().updateElement(cardId, updates as any)
            if (!isApplyingHistoryRef.current) {
              useHistoryStore.getState().pushCommand({
                type: 'update',
                elementId: cardId,
                previousState: cloneElement(previousState),
                newState: cloneElement(newState)
              })
            }
            hasAnyUpdate = true
          }
        }

        if (hasAnyUpdate) {
          // Keep current Fabric selection state after drag/resize commit;
          // this update already came from canvas interactions.
          skipNextSyncRef.current = true
          useCanvasStore.getState().setDirty(true)
        }

        canvas.requestRenderAll()
      } finally {
        activeSelectionDragSessionRef.current = null
        isPointerTransformingRef.current = false
        handlingObjectModifiedRef.current = false
      }
    }

    const handleMouseDown = (e: { target?: FabricObject }) => {
      const target = e.target as any
      if (target?.data?.type === 'card') {
        isPointerTransformingRef.current = true
      }
    }

    const handleMouseUp = () => {
      isPointerTransformingRef.current = false
    }

    canvas.on('object:moving', handleObjectMoving)
    canvas.on('object:scaling', handleObjectScaling)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('mouse:down', handleMouseDown as any)
    canvas.on('mouse:up', handleMouseUp as any)
    return () => {
      canvas.off('object:moving', handleObjectMoving)
      canvas.off('object:scaling', handleObjectScaling)
      canvas.off('object:modified', handleObjectModified)
      canvas.off('mouse:down', handleMouseDown as any)
      canvas.off('mouse:up', handleMouseUp as any)
    }
  }, [
    cloneElement,
    createActiveSelectionDragSession,
    getDragAnchorPoint,
    getCardBounds,
    isActiveSelectionType,
    layoutCardObjects,
    sanitizeBounds
  ])

  // Sync isEditingCardIdRef with isEditingCardId state
  useEffect(() => {
    isEditingCardIdRef.current = isEditingCardId
  }, [isEditingCardId])

  // Hover to activate card so drag/resize can start immediately without pre-click selection.
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleHover = (opt: { target?: FabricObject }) => {
      if (currentTool !== 'select') return
      if (isEditingCardIdRef.current) return
      if (isPointerTransformingRef.current) return

      const target = opt.target as any
      const hoveredCardId =
        target?.data?.type === 'card' && typeof target?.data?.id === 'string'
          ? (target.data.id as string)
          : null
      const hoveredCard = hoveredCardId ? useElementsStore.getState().getElement(hoveredCardId) : null
      const shouldActivateCard = Boolean(hoveredCardId && hoveredCard?.type === 'card' && !hoveredCard.locked)
      const activeObject = canvas.getActiveObject() as any
      const activeCardId =
        activeObject?.data?.type === 'card' && typeof activeObject?.data?.id === 'string'
          ? (activeObject.data.id as string)
          : null

      if (shouldActivateCard) {
        if (activeCardId !== hoveredCardId) {
          canvas.setActiveObject(target)
          hoveredCardIdRef.current = hoveredCardId
          canvas.requestRenderAll()
        }
        return
      }

      if (hoveredCardIdRef.current && activeCardId === hoveredCardIdRef.current) {
        canvas.discardActiveObject()
        hoveredCardIdRef.current = null
        canvas.requestRenderAll()
      }
    }

    canvas.on('mouse:move', handleHover as any)
    return () => {
      canvas.off('mouse:move', handleHover as any)
    }
  }, [currentTool])

  const updateCardWithHistory = useCallback((cardId: string, updates: Record<string, any>) => {
    const currentElement = useElementsStore.getState().getElement(cardId)
    if (!currentElement || currentElement.type !== 'card') return

    let hasChanges = false
    const previousState: Record<string, any> = {}
    const newState: Record<string, any> = {}
    for (const key of Object.keys(updates)) {
      const previousValue = (currentElement as any)[key]
      const nextValue = updates[key]
      const isSame =
        typeof previousValue === 'object' || typeof nextValue === 'object'
          ? JSON.stringify(previousValue) === JSON.stringify(nextValue)
          : previousValue === nextValue
      if (!isSame) {
        previousState[key] = previousValue
        newState[key] = nextValue
        hasChanges = true
      }
    }
    if (!hasChanges) return

    useElementsStore.getState().updateElement(cardId, updates as any)
    if (!isApplyingHistoryRef.current) {
      useHistoryStore.getState().pushCommand({
        type: 'update',
        elementId: cardId,
        previousState: cloneElement(previousState),
        newState: cloneElement(newState)
      })
    }
  }, [cloneElement])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const existingDeleteButtons = canvas.getObjects().filter((obj) => (obj as any).data?.isCardImageDelete)
    existingDeleteButtons.forEach((obj) => canvas.remove(obj))

    if (!isEditingCardId) {
      canvas.requestRenderAll()
      return
    }

    const imageObjects = canvas
      .getObjects()
      .filter((obj) => (obj as any).data?.cardId === isEditingCardId && (obj as any).data?.isCardImage)

    imageObjects.forEach((imageObject) => {
      const imageData = (imageObject as any).data
      const deleteButton = new Textbox('×', {
        width: 18,
        height: 18,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        fill: '#ffffff',
        backgroundColor: '#ef4444',
        objectCaching: false,
        noScaleCache: false,
        editable: false,
        selectable: true,
        evented: true,
        hoverCursor: 'pointer',
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true
      })
      ;(deleteButton as any).data = {
        cardId: imageData.cardId,
        imageId: imageData.imageId,
        imageIndex: imageData.imageIndex,
        isCardImageDelete: true
      }
      canvas.add(deleteButton)
    })

    layoutCardObjects(isEditingCardId, { resizeHeight: false })
  }, [isEditingCardId, layoutCardObjects])

  // Double-click to edit or create card
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      if (currentTool === 'card') {
        const scenePoint = canvas.getScenePoint(opt.e)
        const createdId = addCard(scenePoint.x, scenePoint.y)
        const createdElement = useElementsStore.getState().getElement(createdId)
        if (createdElement && !isApplyingHistoryRef.current) {
          useHistoryStore.getState().pushCommand({
            type: 'create',
            elementId: createdId,
            previousState: cloneElement(createdElement)
          })
        }
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

          const { titleTextbox: titleText, contentTextbox: contentText } = findCardTextboxes(cardId)

          if (titleText || contentText) {
            // Clear any active selection to prevent interference
            canvas.discardActiveObject()
            ignoreNextEditMouseDownRef.current = true

            // Enable editing on the textboxes without re-rendering
            if (titleText) {
              ;(titleText as any).editable = true
              titleText.selectable = true
              titleText.evented = true
              titleText.enterEditing()
              // Position cursor at end of text
              const titleLen = titleText.text?.length || 0
              titleText.setSelectionStart(titleLen)
              titleText.setSelectionEnd(titleLen)
            }
            if (contentText) {
              ;(contentText as any).editable = true
              contentText.selectable = true
              contentText.evented = true
              // Clear placeholder text if it matches
              if (contentText.text === 'Double-click to edit') {
                contentText.text = ''
              }
              canvas.setActiveObject(contentText)
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
          const { titleTextbox, contentTextbox } = findCardTextboxes(editingCardId)

          if (titleTextbox || contentTextbox) {
            const fitted = fitCardToText(editingCardId)
            const title = fitted ? fitted.title : (titleTextbox?.text || '')
            const content = fitted ? fitted.content : (contentTextbox?.text || '')

            // Save to store
            updateCardWithHistory(editingCardId, {
              title,
              content,
              ...(fitted ? { size: fitted.size } : {}),
              updatedAt: new Date().toISOString()
            } as any)

            // Disable editing on the textboxes
            if (titleTextbox) {
              ;(titleTextbox as any).editable = false
              titleTextbox.selectable = false
              titleTextbox.evented = false
            }
            if (contentTextbox) {
              ;(contentTextbox as any).editable = false
              contentTextbox.selectable = false
              contentTextbox.evented = false
            }

            setIsEditingCardId(null)
            useElementsStore.getState().setEditingCard(null)
            useCanvasStore.getState().setDirty(true)
          }
        }

        const scenePoint = canvas.getScenePoint(opt.e)
        const createdId = addCard(scenePoint.x, scenePoint.y)
        const createdElement = useElementsStore.getState().getElement(createdId)
        if (createdElement && !isApplyingHistoryRef.current) {
          useHistoryStore.getState().pushCommand({
            type: 'create',
            elementId: createdId,
            previousState: cloneElement(createdElement)
          })
        }
      }
    }

    canvas.on('mouse:dblclick', handleDblClick)
    return () => { canvas.off('mouse:dblclick', handleDblClick) }
  }, [cloneElement, currentTool, addCard, findCardTextboxes, setTool, syncElementsToCanvas, updateCardWithHistory])

  // Handle selection
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleSelection = (opt: { selected?: FabricObject[] }) => {
      if (opt.selected && opt.selected.length > 0) {
        const selectedCards = opt.selected.filter((obj) => (obj as any)?.data?.type === 'card' && (obj as any)?.data?.id)
        const id = (selectedCards[0] as any)?.data?.id
        if (id) useElementsStore.getState().setSelected(id)
        const activeObject = canvas.getActiveObject() as any
        const activeSelection = isActiveSelectionType(activeObject?.type)
          ? activeObject
          : isActiveSelectionType((selectedCards[0] as any)?.group?.type)
            ? (selectedCards[0] as any).group
            : null

        if (activeSelection && selectedCards.length > 0) {
          const entries = selectedCards.map((obj) => ({
            cardId: (obj as any).data.id as string,
            cardObject: obj as any
          }))
          createActiveSelectionDragSession(activeSelection, entries)
        }
      }
    }

    const handleSelectionCleared = () => {
      activeSelectionDragSessionRef.current = null
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
  }, [createActiveSelectionDragSession, isActiveSelectionType])

  // Handle context menu
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onMouseDown = (opt: { e: TPointerEvent; target?: FabricObject }) => {
      const e = opt.e as unknown as MouseEvent
      const target = opt.target as any
      if (DEBUG_CONTEXT_MENU) {
        console.log('[ctx-debug] fabric mouse:down', {
          button: e.button,
          hasTarget: Boolean(target),
          targetType: target?.type,
          targetData: target?.data
        })
      }
      if (target?.data?.isCardImageDelete) {
        removeImageFromCard(target.data.cardId, target.data.imageId)
        useCanvasStore.getState().setDirty(true)
        return
      }
      if (e.button === 2) {
        const id = (opt.target as any)?.data?.id || (opt.target as any)?.data?.cardId
        if (DEBUG_CONTEXT_MENU) {
          console.log('[ctx-debug] right click target resolved', {
            rawData: (opt.target as any)?.data,
            resolvedId: id
          })
        }
        if (!id) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            elementId: null,
            isLocked: false
          })
          return
        }

        const element = useElementsStore.getState().getElement(id)
        if (DEBUG_CONTEXT_MENU) {
          console.log('[ctx-debug] element lookup', {
            id,
            found: Boolean(element)
          })
        }
        if (element) {
          if (DEBUG_CONTEXT_MENU) {
            console.log('[ctx-debug] setContextMenu', {
              x: e.clientX,
              y: e.clientY,
              id: element.id
            })
          }
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            elementId: id,
            isLocked: element.locked
          })
        } else {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            elementId: null,
            isLocked: false
          })
        }
      }
    }

    canvas.on('mouse:down', onMouseDown as any)
    return () => { canvas.off('mouse:down', onMouseDown as any) }
  }, [removeImageFromCard])

  // Handle card save
  const saveEditingCard = useCallback((texts: { title?: string; content: string }) => {
    if (isEditingCardId) {
      const fitted = fitCardToText(isEditingCardId)

      // Save text content to store
      updateCardWithHistory(isEditingCardId, {
        title: fitted ? fitted.title : texts.title,
        content: fitted ? fitted.content : texts.content,
        ...(fitted ? { size: fitted.size } : {}),
        updatedAt: new Date().toISOString()
      } as any)

      // Disable editing on the textboxes without re-rendering
      const { titleTextbox, contentTextbox } = findCardTextboxes(isEditingCardId)
      if (titleTextbox) {
        ;(titleTextbox as any).editable = false
        titleTextbox.selectable = false
        titleTextbox.evented = false
      }
      if (contentTextbox) {
        ;(contentTextbox as any).editable = false
        contentTextbox.selectable = false
        contentTextbox.evented = false
      }

      setIsEditingCardId(null)
      useElementsStore.getState().setEditingCard(null)
      useCanvasStore.getState().setDirty(true)
    }
  }, [findCardTextboxes, fitCardToText, isEditingCardId, updateCardWithHistory])

  const cancelEditingCard = useCallback(() => {
    // Disable editing on the textboxes without re-rendering
    if (isEditingCardId) {
      const { titleTextbox, contentTextbox } = findCardTextboxes(isEditingCardId)
      if (titleTextbox) {
        ;(titleTextbox as any).editable = false
        titleTextbox.selectable = false
        titleTextbox.evented = false
      }
      if (contentTextbox) {
        ;(contentTextbox as any).editable = false
        contentTextbox.selectable = false
        contentTextbox.evented = false
      }
    }

    setIsEditingCardId(null)
    useElementsStore.getState().setEditingCard(null)
  }, [findCardTextboxes, isEditingCardId])

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

      const { titleTextbox, contentTextbox } = findCardTextboxes(currentEditingId)

      if (!titleTextbox && !contentTextbox) return

      const fitted = fitCardToText(currentEditingId)
      const title = fitted ? fitted.title : (titleTextbox?.text || '')
      const content = fitted ? fitted.content : (contentTextbox?.text || '')

      // Always save when editing exits, regardless of what was clicked
      updateCardWithHistory(currentEditingId, {
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
      if (ignoreNextEditMouseDownRef.current) {
        ignoreNextEditMouseDownRef.current = false
        return
      }

      const currentEditingId = isEditingCardIdRef.current
      if (!currentEditingId) return

      const target = e.target as any

      // Don't interfere with text editing clicks on the editing card's textboxes
      if (target && (target.type === 'textbox' || target.type === 'i-text')) return

      const { titleTextbox, contentTextbox } = findCardTextboxes(currentEditingId)

      if (!titleTextbox && !contentTextbox) return

      // Get the current text from textboxes
      const fitted = fitCardToText(currentEditingId)
      const title = fitted ? fitted.title : (titleTextbox?.text || '')
      const content = fitted ? fitted.content : (contentTextbox?.text || '')

      // Save content to store
      updateCardWithHistory(currentEditingId, {
        title,
        content,
        ...(fitted ? { size: fitted.size } : {}),
        updatedAt: new Date().toISOString()
      } as any)
      useCanvasStore.getState().setDirty(true)

      // Exit editing mode on textboxes
      if (titleTextbox) {
        ;(titleTextbox as any).editable = false
        titleTextbox.selectable = false
        titleTextbox.evented = false
      }
      if (contentTextbox) {
        ;(contentTextbox as any).editable = false
        contentTextbox.selectable = false
        contentTextbox.evented = false
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
  }, [findCardTextboxes, fitCardToText, isEditingCardId, saveEditingCard, updateCardWithHistory])

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

  const copyCardToClipboard = useCallback((cardId: string | null | undefined) => {
    if (!cardId) return false
    const element = useElementsStore.getState().getElement(cardId)
    if (!element || element.type !== 'card') return false

    const card = element as CardElement
    copiedCardRef.current = {
      ...card,
      position: { ...card.position },
      size: { ...card.size },
      images: card.images.map((image) => ({ ...image }))
    }
    pasteCountRef.current = 0
    setHasCopiedCard(true)
    return true
  }, [])

  const resolveScenePositionFromClient = useCallback((clientPoint?: { x: number; y: number } | null) => {
    if (!clientPoint) return null
    const canvas = fabricRef.current
    if (!canvas) return null

    try {
      const scene = canvas.getScenePoint({
        clientX: clientPoint.x,
        clientY: clientPoint.y
      } as unknown as MouseEvent)
      if (Number.isFinite(scene.x) && Number.isFinite(scene.y)) {
        return { x: scene.x, y: scene.y }
      }
    } catch {
      // Fall through to a viewport-transform approximation.
    }

    const vpt = canvas.viewportTransform
    const zoom = canvas.getZoom() || 1
    if (vpt && Number.isFinite(vpt[4]) && Number.isFinite(vpt[5])) {
      return {
        x: (clientPoint.x - vpt[4]) / zoom,
        y: (clientPoint.y - vpt[5]) / zoom
      }
    }

    return { x: clientPoint.x, y: clientPoint.y }
  }, [])

  const pasteCardFromClipboard = useCallback((
    anchorCardId?: string | null,
    pasteClientPoint?: { x: number; y: number } | null
  ) => {
    const copied = copiedCardRef.current
    if (!copied) return false

    let basePosition = copied.position
    const pointerScenePosition = resolveScenePositionFromClient(pasteClientPoint ?? lastPointerClientRef.current)
    if (pointerScenePosition) {
      basePosition = pointerScenePosition
    } else if (anchorCardId) {
      const anchor = useElementsStore.getState().getElement(anchorCardId)
      if (anchor && anchor.type === 'card') {
        basePosition = anchor.position
      }
    }

    pasteCountRef.current += 1
    const offsetStep = 24
    const offset = offsetStep * pasteCountRef.current
    const now = new Date().toISOString()
    const pastedCard: Omit<CardElement, 'id'> = {
      ...copied,
      position: {
        x: basePosition.x + offset,
        y: basePosition.y + offset
      },
      images: copied.images.map((image) => ({
        ...image,
        id: crypto.randomUUID()
      })),
      createdAt: now,
      updatedAt: now
    }

    const newId = useElementsStore.getState().addElement(pastedCard)
    const createdElement = useElementsStore.getState().getElement(newId)
    if (createdElement && !isApplyingHistoryRef.current) {
      useHistoryStore.getState().pushCommand({
        type: 'create',
        elementId: newId,
        previousState: cloneElement(createdElement)
      })
    }
    useElementsStore.getState().setSelected(newId)
    useCanvasStore.getState().setDirty(true)
    return true
  }, [cloneElement, resolveScenePositionFromClient])

  // Context menu handlers
  const handleContextDelete = () => {
    if (contextMenu?.elementId) {
      const targetElement = useElementsStore.getState().getElement(contextMenu.elementId)
      useElementsStore.getState().removeElement(contextMenu.elementId)
      if (targetElement && !isApplyingHistoryRef.current) {
        useHistoryStore.getState().pushCommand({
          type: 'delete',
          elementId: contextMenu.elementId,
          previousState: cloneElement(targetElement)
        })
      }
      useCanvasStore.getState().setDirty(true)
    }
  }

  const handleContextCopy = () => {
    if (contextMenu?.elementId) {
      copyCardToClipboard(contextMenu.elementId)
    }
  }

  const handleContextPaste = () => {
    pasteCardFromClipboard(
      contextMenu?.elementId,
      contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null
    )
  }

  const handleContextBringToFront = () => {
    if (contextMenu?.elementId) {
      useElementsStore.getState().bringToFront(contextMenu.elementId)
    }
  }

  const handleContextBringForward = () => {
    if (contextMenu?.elementId) {
      useElementsStore.getState().bringForward(contextMenu.elementId)
    }
  }

  const handleContextSendBackward = () => {
    if (contextMenu?.elementId) {
      useElementsStore.getState().sendBackward(contextMenu.elementId)
    }
  }

  const handleContextSendToBack = () => {
    if (contextMenu?.elementId) {
      useElementsStore.getState().sendToBack(contextMenu.elementId)
    }
  }

  const handleContextLock = () => {
    if (contextMenu?.elementId) {
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
      const target = e.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      const isNativeTextInput =
        tagName === 'input' ||
        tagName === 'textarea' ||
        Boolean(target?.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
        const isFabricHiddenTextarea =
          tagName === 'textarea' && (
            target?.classList?.contains('hiddenTextarea') ||
            target?.getAttribute('aria-hidden') === 'true'
          )
        const allowInputSelectAll = isNativeTextInput && !isFabricHiddenTextarea

        // Avoid browser "select all page text" in canvas mode.
        // Keep default behavior only for real text inputs or card text editing.
        if (!allowInputSelectAll && !isEditingCardIdRef.current) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        useSearchStore.getState().open()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (!isNativeTextInput && !isEditingCardIdRef.current) {
          const selectedId = useElementsStore.getState().selectedId
          if (selectedId) {
            e.preventDefault()
            copyCardToClipboard(selectedId)
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!isNativeTextInput && !isEditingCardIdRef.current && hasCopiedCard) {
          e.preventDefault()
          pasteCardFromClipboard()
        }
      }
      if (e.key === 'Escape') {
        useSearchStore.getState().close()
        cancelEditingCard()
      }
      if (e.key === 'Delete' && !isEditingCardId) {
        const selectedId = useElementsStore.getState().selectedId
        if (selectedId) {
          const targetElement = useElementsStore.getState().getElement(selectedId)
          useElementsStore.getState().removeElement(selectedId)
          if (targetElement && !isApplyingHistoryRef.current) {
            useHistoryStore.getState().pushCommand({
              type: 'delete',
              elementId: selectedId,
              previousState: cloneElement(targetElement)
            })
          }
          useCanvasStore.getState().setDirty(true)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        executeUndo()
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        executeRedo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const selectedId = useElementsStore.getState().selectedId
        if (selectedId) {
          const newId = useElementsStore.getState().duplicateElement(selectedId)
          if (newId) {
            const duplicated = useElementsStore.getState().getElement(newId)
            if (duplicated && !isApplyingHistoryRef.current) {
              useHistoryStore.getState().pushCommand({
                type: 'create',
                elementId: newId,
                previousState: cloneElement(duplicated)
              })
            }
            useElementsStore.getState().setSelected(newId)
            useCanvasStore.getState().setDirty(true)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cloneElement, isEditingCardId, cancelEditingCard, copyCardToClipboard, pasteCardFromClipboard, hasCopiedCard, executeUndo, executeRedo])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const editingCardId = isEditingCardIdRef.current
      if (!editingCardId || !e.clipboardData) return

      const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
      if (!imageItem) {
        const target = e.target as HTMLTextAreaElement | null
        if (!target || target.tagName !== 'TEXTAREA' || !target.classList.contains('hiddenTextarea')) return

        const plainText = e.clipboardData.getData('text/plain')
        if (!plainText) return

        e.preventDefault()
        const selectionStart = target.selectionStart ?? target.value.length
        const selectionEnd = target.selectionEnd ?? selectionStart
        target.setRangeText(plainText, selectionStart, selectionEnd, 'end')
        target.dispatchEvent(new Event('input', { bubbles: true }))
        return
      }

      const file = imageItem.getAsFile()
      if (!file) return

      e.preventDefault()
      const reader = new FileReader()
      reader.onload = () => {
        const src = typeof reader.result === 'string' ? reader.result : ''
        if (!src) return

        addImageToCard(editingCardId, src)
        useCanvasStore.getState().setDirty(true)
      }
      reader.readAsDataURL(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [addImageToCard])

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
      undo: () => executeUndo(),
      redo: () => executeRedo(),
      delete: () => {
        const selectedId = useElementsStore.getState().selectedId
        if (!selectedId) return
        const targetElement = useElementsStore.getState().getElement(selectedId)
        useElementsStore.getState().removeElement(selectedId)
        if (targetElement && !isApplyingHistoryRef.current) {
          useHistoryStore.getState().pushCommand({
            type: 'delete',
            elementId: selectedId,
            previousState: cloneElement(targetElement)
          })
        }
        useCanvasStore.getState().setDirty(true)
      },
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
    api.onMenuUndo(() => handlers.undo())
    api.onMenuRedo(() => handlers.redo())
    api.onMenuDelete(() => handlers.delete())
    api.onMenuSearch(() => handlers.search())
    api.onMenuZoomIn(() => handlers.zoomIn())
    api.onMenuZoomOut(() => handlers.zoomOut())
    api.onMenuZoomReset(() => handlers.zoomReset())
  }, [cloneElement, executeRedo, executeUndo, loadDocument, newDocument, resetZoom, saveDocument, saveDocumentAs, zoomIn, zoomOut])

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
          onCopy={handleContextCopy}
          onPaste={handleContextPaste}
          canPaste={hasCopiedCard}
          showCardActions={Boolean(contextMenu.elementId)}
          onBringToFront={handleContextBringToFront}
          onBringForward={handleContextBringForward}
          onSendBackward={handleContextSendBackward}
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
      {autoSaveStatus && (
        <div className="absolute right-4 bottom-4 z-50 pointer-events-none">
          <div className="px-3 py-2 rounded-md bg-gray-900/90 text-white text-sm shadow-lg">
            {autoSaveStatus === 'saving' ? '自动保存中' : '自动保存已完成'}
          </div>
        </div>
      )}
    </div>
  )
}
