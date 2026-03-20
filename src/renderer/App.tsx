import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas'
import { TopBar } from './components/TopBar/TopBar'

export default function App() {
  return (
    <div className="w-full h-full">
      <TopBar />
      <InfiniteCanvas />
    </div>
  )
}
