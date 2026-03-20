interface ZoomControlProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControl({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlProps) {
  return (
    <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 flex items-center gap-3 z-40">
      <button
        onClick={onZoomOut}
        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-lg text-lg transition-colors"
        title="缩小"
      >
        −
      </button>
      <div className="w-16 text-center text-sm font-medium">
        {zoom}%
      </div>
      <button
        onClick={onZoomIn}
        className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-lg text-lg transition-colors"
        title="放大"
      >
        +
      </button>
      <div className="w-px h-5 bg-gray-300" />
      <button
        onClick={onReset}
        className="px-2 py-1 text-xs hover:bg-gray-200 rounded transition-colors"
        title="重置缩放"
      >
        reset
      </button>
    </div>
  )
}
