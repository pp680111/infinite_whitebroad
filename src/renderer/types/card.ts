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

export interface ImageElement {
  id: string
  type: 'image'
  position: { x: number; y: number }
  size: { width: number; height: number }
  src: string // Base64
  locked: boolean
}

export type CanvasElement = CardElement | ImageElement
