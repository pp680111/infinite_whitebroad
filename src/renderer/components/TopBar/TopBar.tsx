import { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { useSearchStore } from '../../stores/searchStore'

export function TopBar() {
  const { documentName, setDocumentName, isDirty, newDocument, saveDocument, saveDocumentAs, loadDocument } = useCanvasStore()
  const { open: openSearch } = useSearchStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(documentName)
  const [showMenu, setShowMenu] = useState(false)
  const [showSettingsTip, setShowSettingsTip] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleNew = async () => {
    setShowMenu(false)
    try {
      newDocument()
    } catch (e) {
      console.warn('New document failed in browser mode')
    }
  }

  const handleOpen = async () => {
    setShowMenu(false)
    try {
      await loadDocument()
    } catch (e) {
      console.warn('Open document failed in browser mode')
    }
  }

  const handleSave = async () => {
    setShowMenu(false)
    try {
      await saveDocument()
    } catch (e) {
      console.warn('Save document failed in browser mode')
    }
  }

  const handleSaveAs = async () => {
    setShowMenu(false)
    try {
      await saveDocumentAs()
    } catch (e) {
      console.warn('Save as failed in browser mode')
    }
  }

  const handleSettingsClick = () => {
    setShowSettingsTip(true)
    setTimeout(() => setShowSettingsTip(false), 2000)
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 z-40">
      {/* Left: Menu button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg"
        >
          ≡
        </button>
        {showMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
            <button
              onClick={handleNew}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📄</span> 新建
              <span className="ml-auto text-gray-400 text-xs">Ctrl+N</span>
            </button>
            <button
              onClick={handleOpen}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📂</span> 打开...
              <span className="ml-auto text-gray-400 text-xs">Ctrl+O</span>
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleSave}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💾</span> 保存
              <span className="ml-auto text-gray-400 text-xs">Ctrl+S</span>
            </button>
            <button
              onClick={handleSaveAs}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📥</span> 另存为...
              <span className="ml-auto text-gray-400 text-xs">Ctrl+Shift+S</span>
            </button>
          </div>
        )}
      </div>

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
        <div className="relative">
          <button
            onClick={handleSettingsClick}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-sm"
            title="设置"
          >
            ⚙
          </button>
          {showSettingsTip && (
            <div className="absolute top-full right-0 mt-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
              尚未实现
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
