import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onLock: () => void
  isLocked: boolean
}

export function ContextMenu({
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onLock,
  isLocked
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onDuplicate(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        复制
      </button>
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        删除
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => { onBringToFront(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        置顶
      </button>
      <button
        onClick={() => { onSendToBack(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        置底
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => { onLock(); onClose() }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
      >
        {isLocked ? '解锁' : '锁定'}
      </button>
    </div>
  )
}
