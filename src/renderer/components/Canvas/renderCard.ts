import { Rect, Textbox, Shadow } from 'fabric'

export interface CardRenderResult {
  cardObject: Rect
  titleText: Textbox | undefined
  contentText: Textbox
}

export function renderCard(
  card: {
    id: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    title?: string
    content: string
    locked: boolean
  },
  options?: { isEditing?: boolean }
): CardRenderResult {
  const { id, position, size, title, content } = card
  const isEditing = options?.isEditing ?? false
  const textInteractive = isEditing && !card.locked

  // Card background with shadow - standalone rect, not a group
  const bg = new Rect({
    width: size.width,
    height: size.height,
    fill: '#fefefe',
    stroke: '#e8e8e8',
    strokeWidth: 1,
    rx: 8,
    ry: 8,
    shadow: new Shadow({
      color: 'rgba(0,0,0,0.1)',
      blur: 10,
      offsetX: 2,
      offsetY: 2
    }),
    left: position.x,
    top: position.y,
    selectable: !card.locked,
    hasControls: !card.locked,
    hasBorders: !card.locked,
    centeredScaling: false,
    lockScalingFlip: true,
    lockMovementX: card.locked,
    lockMovementY: card.locked,
    lockScalingX: card.locked,
    lockScalingY: card.locked,
    lockRotation: card.locked
  })
  ;(bg as any).lockUniScaling = false
  ;(bg as any).data = { id, type: 'card', isEditing: options?.isEditing ?? false }

  // Title if present - independent object that won't scale with the card
  let titleText: Textbox | undefined
  if (title) {
    titleText = new Textbox(title, {
      width: size.width - 20,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#333',
      objectCaching: false,
      noScaleCache: false,
      left: position.x + 10,
      top: position.y + 10,
      editable: isEditing,
      textDirection: 'ltr',
      selectable: textInteractive,
      evented: textInteractive,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true
    })
    ;(titleText as any).data = { cardId: id, isTitle: true }
  }

  // Content - strip HTML for display and use ltr direction
  // Independent object that won't scale with the card
  const plainText = content ? content.replace(/<[^>]*>/g, '') : ''
  const displayContent = plainText || 'Double-click to edit'
  const contentText = new Textbox(displayContent, {
    width: size.width - 20,
    fontSize: 13,
    fill: content ? '#555' : '#999',
    objectCaching: false,
    noScaleCache: false,
    left: position.x + 10,
    top: position.y + (title ? 35 : 10),
    editable: isEditing,
    textDirection: 'ltr',
    selectable: textInteractive,
    evented: textInteractive,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true
  })
  ;(contentText as any).data = { cardId: id, isContent: true }

  return {
    cardObject: bg,
    titleText,
    contentText
  }
}
