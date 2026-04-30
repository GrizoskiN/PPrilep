import Topbar from './Topbar'
import LeftNav from './LeftNav'
import RightPanel from './RightPanel'
import MarqueeBanner from '../ui/MarqueeBanner'

interface Props {
  children: React.ReactNode
  rightPanel?: React.ReactNode
}

export default function Shell({ children, rightPanel }: Props) {
  return (
    <div className="flex flex-col h-screen w-full">
      <MarqueeBanner />
      {/* Row 1: topbar */}
      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr_270px] shrink-0">
        <div className="hidden md:block border-r border-zinc-200" />
        <Topbar />
        <div className="hidden md:block border-l border-zinc-200" />
      </div>

      {/* Row 2: alert marquee */}

      {/* Row 3: main content columns */}
      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr_270px] flex-1 min-h-0">
        <div className="hidden md:block">
          <LeftNav />
        </div>
        <main className="overflow-y-auto bg-zinc-50">
          {children}
        </main>
        <div className="hidden md:block">
          {rightPanel ?? <RightPanel />}
        </div>
      </div>
    </div>
  )
}
