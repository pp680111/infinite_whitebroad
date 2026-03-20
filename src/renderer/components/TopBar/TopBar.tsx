import { useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useSearchStore } from '../../stores/searchStore'

export function TopBar() {
  const { documentName, setDocumentName, isDirty } = useCanvasStore()
  const { open: openSearch } = useSearchStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(documentName)

  const handleNameClick = () => {
    setEditName(documentName)
    setIsEditing(true)
  }

  const handleNameSave = () => {
    setDocumentName(editName)
    setIsEditing(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 z-40">
      {/* Left: Menu button placeholder */}
      <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg">
        ≡
      </button>

      {/* Center: Document name */}
      <div className="flex-1 text-center">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="px-2 py-1 text-sm text-center outline-none border border-blue-500 rounded"
            autoFocus
          />
        ) : (
          <button
            onClick={handleNameClick}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
          >
            {documentName}
            {isDirty && <span className="ml-1 text-gray-400">*</span>}
          </button>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => openSearch()}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-sm"
          title="搜索 (Ctrl+F)"
        >
          🔍
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-sm"
          title="设置"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
