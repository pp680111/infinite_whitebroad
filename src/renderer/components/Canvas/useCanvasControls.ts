import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, TPointerEvent, TPointerEventInfo, Point } from 'fabric'

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
    const e = opt.e as unknown as WheelEvent
    const delta = e.deltaY
    let newZoom = canvas.getZoom() * (delta > 0 ? 0.9 : 1.1)
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))

    const pointer = new Point(e.offsetX, e.offsetY)
    canvas.zoomToPoint(pointer, newZoom)
    setZoom(Math.round(newZoom * 100))
    e.preventDefault()
    e.stopPropagation()
  }, [canvas, minZoom, maxZoom])

  const startPan = useCallback((e: TPointerEvent) => {
    if (!canvas || !spaceDownRef.current) return
    const mouseEvent = e as unknown as MouseEvent
    canvas.selection = false
    canvas.defaultCursor = 'grabbing'
    lastPosRef.current = { x: mouseEvent.clientX, y: mouseEvent.clientY }
    setIsPanning(true)
  }, [canvas])

  const updatePan = useCallback((e: TPointerEvent) => {
    if (!canvas || !isPanning) return
    const mouseEvent = e as unknown as MouseEvent
    const vpt = canvas.viewportTransform!
    vpt[4] += mouseEvent.clientX - lastPosRef.current.x
    vpt[5] += mouseEvent.clientY - lastPosRef.current.y
    canvas.requestRenderAll()
    lastPosRef.current = { x: mouseEvent.clientX, y: mouseEvent.clientY }
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
    canvas.zoomToPoint(new Point(canvas.width! / 2, canvas.height! / 2), newZoom)
    setZoom(Math.round(newZoom * 100))
  }, [canvas, maxZoom])

  const zoomOut = useCallback(() => {
    if (!canvas) return
    const newZoom = Math.max(canvas.getZoom() / 1.2, minZoom)
    canvas.zoomToPoint(new Point(canvas.width! / 2, canvas.height! / 2), newZoom)
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
