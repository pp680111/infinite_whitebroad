import { useEffect, useRef } from 'react'
import { useSearchStore } from '../../stores/searchStore'
import { useElementsStore } from '../../stores/elementsStore'
import { CardElement } from '../../types/card'

export function SearchPanel() {
  const { isOpen, query, results, currentIndex, close, setQuery, nextResult, prevResult } = useSearchStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      useSearchStore.getState().clearResults()
      return
    }

    const elements = useElementsStore.getState().elements
    const matchingCards = elements.filter((el) => {
      if (el.type !== 'card') return false
      const card = el as CardElement
      const searchLower = value.toLowerCase()
      const titleMatch = card.title?.toLowerCase().includes(searchLower) || false
      const contentText = card.content.replace(/<[^>]*>/g, '')
      const contentMatch = contentText.toLowerCase().includes(searchLower)
      return titleMatch || contentMatch
    })

    useSearchStore.getState().setResults(matchingCards.map((c) => c.id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevResult()
      } else {
        nextResult()
      }
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索卡片内容..."
            className="w-full px-3 py-2 text-sm outline-none"
          />
        </div>
        {results.length > 0 && (
          <div className="p-2 text-xs text-gray-500 text-center">
            {currentIndex + 1} / {results.length} 个结果
            <span className="ml-2 text-gray-400">按 Enter 定位</span>
          </div>
        )}
        {query && results.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            未找到匹配结果
          </div>
        )}
      </div>
    </div>
  )
}
