import { useToolStore, ToolType } from '../../stores/toolStore'

interface ToolButton {
  type: ToolType
  icon: string
  label: string
}

const tools: ToolButton[] = [
  { type: 'select', icon: '⬚', label: '选择' },
  { type: 'rectangle', icon: '▢', label: '矩形' },
  { type: 'ellipse', icon: '◯', label: '椭圆' },
  { type: 'image', icon: '🖼', label: '图片' },
  { type: 'card', icon: '📝', label: '文本卡片' }
]

export function Toolbar() {
  const { currentTool, setTool } = useToolStore()

  const handleImageClick = async () => {
    setTool('image')
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          // TODO: Implement image addition to canvas
          setTool('select')
        }
        reader.readAsDataURL(file)
      } else {
        setTool('select')
      }
    }
    input.click()
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 flex items-center gap-1 z-40">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => {
            if (tool.type === 'image') {
              handleImageClick()
            } else {
              setTool(tool.type)
            }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
            currentTool === tool.type
              ? 'bg-blue-500 text-white'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}
