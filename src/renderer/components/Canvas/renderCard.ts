import { FabricObject, Rect, Textbox, Group, Shadow } from 'fabric'

export function renderCard(
  card: {
    id: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    title?: string
    content: string
    locked: boolean
  }
): FabricObject {
  const { id, position, size, title, content } = card

  const cardGroup: FabricObject[] = []

  // Card background with shadow
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
    })
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
  const displayContent = content || 'Double-click to edit'
  const contentText = new Textbox(displayContent, {
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
    selectable: !card.locked,
    hasControls: !card.locked,
    hasBorders: !card.locked,
    lockMovementX: card.locked,
    lockMovementY: card.locked,
    lockScalingX: card.locked,
    lockScalingY: card.locked,
    lockRotation: card.locked
  })

  ;(group as any).data = { id, type: 'card' }

  return group
}
