import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'

interface CardEditorProps {
  initialTitle: string
  initialContent: string
  position: { x: number; y: number; width: number; height: number }
  onSave: (title: string, content: string) => void
  onCancel: () => void
}

export function CardEditor({
  initialTitle,
  initialContent,
  position,
  onSave,
  onCancel
}: CardEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const contentRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // Only set initial content once, then let browser handle input naturally
  useEffect(() => {
    if (contentRef.current && !initializedRef.current) {
      contentRef.current.innerHTML = initialContent || ''
      initializedRef.current = true
    }
    contentRef.current?.focus()
  }, [initialContent])

  const handleSave = () => {
    const content = contentRef.current?.innerHTML || ''
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
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
      style={{
        left: position.x,
        top: position.y + 48, // Below top bar
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
        suppressContentEditableWarning
        className="p-3 text-sm outline-none min-h-[60px]"
        style={{ minHeight: '60px' }}
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
