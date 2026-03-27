import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, FabricObject, FabricImage, Textbox } from 'fabric'
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
  const renderVersionRef = useRef(0)
  const ignoreNextEditMouseDownRef = useRef(false)
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
  const addImageToCard = useElementsStore((s) => s.addImageToCard)
  const removeImageFromCard = useElementsStore((s) => s.removeImageFromCard)
  const layoutCardObjects = useCallback((
    cardId: string,
    options?: { fitTextWidth?: boolean; resizeHeight?: boolean },
    overrideCardObject?: any
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

    if (titleText?.initDimensions) titleText.initDimensions()
    if (contentText?.initDimensions) contentText.initDimensions()

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
    }

    const cardLeft = resolvedCardObject.left
    const cardTop = resolvedCardObject.top
    const innerWidth = Math.max(resolvedCardObject.width * (resolvedCardObject.scaleX || 1) - 20, 40)
    let currentTop = cardTop + 10

    if (titleText) {
      titleText.set({
        width: innerWidth,
        left: cardLeft + 10,
        top: currentTop
      })
      titleText.initDimensions?.()
      titleText.setCoords()
      currentTop += (titleText.height || 0) + 8
    }

    contentText.set({
      width: innerWidth,
      left: cardLeft + 10,
      top: currentTop
    })
    contentText.initDimensions?.()
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
        width: resolvedCardObject.width * (resolvedCardObject.scaleX || 1),
        height: options?.resizeHeight ? nextHeight : resolvedCardObject.height * (resolvedCardObject.scaleY || 1)
      }
    }
  }, [])
  const fitCardToText = useCallback((cardId: string) => {
    return layoutCardObjects(cardId, { fitTextWidth: true, resizeHeight: true })
  }, [layoutCardObjects])

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
    void syncElementsToCanvas()
  }, [syncElementsToCanvas])

  // Sync card state changes (position, size, content) to store
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const getCardEntriesFromTarget = (target: any): Array<{ cardId: string; cardObject: any }> => {
      if (!target) return []
      if (target.data?.type === 'card' && target.data?.id) {
        return [{ cardId: target.data.id as string, cardObject: target }]
      }

      if (target.type === 'activeSelection' && typeof target.getObjects === 'function') {
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

    const handleObjectMoving = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const cardEntries = getCardEntriesFromTarget(target)
      if (cardEntries.length === 0) return

      for (const entry of cardEntries) {
        layoutCardObjects(entry.cardId, { resizeHeight: false }, entry.cardObject)
      }

      canvas.requestRenderAll()
    }

    const handleObjectScaling = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const cardEntries = getCardEntriesFromTarget(target)
      if (cardEntries.length === 0) return

      for (const entry of cardEntries) {
        layoutCardObjects(entry.cardId, { resizeHeight: false }, entry.cardObject)
      }

      canvas.requestRenderAll()
    }

    const handleObjectModified = (e: { target?: FabricObject }) => {
      const target = e.target as any
      const cardEntries = getCardEntriesFromTarget(target)
      if (cardEntries.length === 0) return

      let hasAnyUpdate = false

      for (const entry of cardEntries) {
        const cardId = entry.cardId
        const cardObject = entry.cardObject
        const currentElement = useElementsStore.getState().getElement(cardId)
        if (!cardObject || !currentElement || currentElement.type !== 'card') continue

        const updates: Record<string, any> = {}
        const newPosition = {
          x: cardObject.left,
          y: cardObject.top
        }
        if (currentElement.position.x !== newPosition.x || currentElement.position.y !== newPosition.y) {
          updates.position = newPosition
        }

        const newSize = {
          width: cardObject.width * (cardObject.scaleX || 1),
          height: cardObject.height * (cardObject.scaleY || 1)
        }
        if (currentElement.size.width !== newSize.width || currentElement.size.height !== newSize.height) {
          updates.size = newSize
          cardObject.set({
            width: newSize.width,
            height: newSize.height,
            scaleX: 1,
            scaleY: 1
          })
        }

        const fitted = layoutCardObjects(cardId, { resizeHeight: false }, cardObject)
        const title = fitted?.title || ''
        const content = fitted?.content || ''
        if (currentElement.title !== title || currentElement.content !== content) {
          updates.title = title
          updates.content = content
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString()
          useElementsStore.getState().updateElement(cardId, updates as any)
          hasAnyUpdate = true
        }
      }

      if (hasAnyUpdate) {
        useCanvasStore.getState().setDirty(true)
      }

      // Ensure selection object does not keep stale transform state after commit.
      canvas.discardActiveObject()
      canvas.requestRenderAll()
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
        addCard(scenePoint.x, scenePoint.y)
      }
    }

    canvas.on('mouse:dblclick', handleDblClick)
    return () => { canvas.off('mouse:dblclick', handleDblClick) }
  }, [currentTool, addCard, setTool, syncElementsToCanvas])

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
      const target = opt.target as any
      if (target?.data?.isCardImageDelete) {
        removeImageFromCard(target.data.cardId, target.data.imageId)
        useCanvasStore.getState().setDirty(true)
        return
      }
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
  }, [removeImageFromCard])

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
                o.selectable = false
                o.evented = false
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
            o.selectable = false
            o.evented = false
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
      if (ignoreNextEditMouseDownRef.current) {
        ignoreNextEditMouseDownRef.current = false
        return
      }

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

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const editingCardId = isEditingCardIdRef.current
      if (!editingCardId || !e.clipboardData) return

      const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
      if (!imageItem) return

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
