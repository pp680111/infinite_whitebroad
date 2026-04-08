import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onDelete: () => void
  onCopy: () => void
  onPaste: () => void
  canPaste: boolean
  showCardActions: boolean
  onBringToFront: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onSendToBack: () => void
  onLock: () => void
  isLocked: boolean
}

export function ContextMenu({
  x,
  y,
  onClose,
  onDelete,
  onCopy,
  onPaste,
  canPaste,
  showCardActions,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onLock,
  isLocked
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const openedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    openedAtRef.current = Date.now()

    const handleClickOutside = (e: MouseEvent) => {
      if (e.button === 2) return
      if (Date.now() - openedAtRef.current < 120) return
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
  }, [onClose, x, y])

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50"
      style={{ left: x, top: y, zIndex: 10000 }}
    >
      <button
        onClick={() => { onPaste(); onClose() }}
        disabled={!canPaste}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-transparent"
      >
        粘贴
      </button>

      {showCardActions && (
        <>
          <button
            onClick={() => { onCopy(); onClose() }}
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
            onClick={() => { onBringForward(); onClose() }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            上移一层
          </button>
          <button
            onClick={() => { onSendBackward(); onClose() }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            下移一层
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
        </>
      )}
    </div>
  )
}
