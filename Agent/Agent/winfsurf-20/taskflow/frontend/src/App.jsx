import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import TaskView from './pages/TaskView.jsx'
import History from './pages/History.jsx'

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <header className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight">TaskFlow</div>
          <nav className="flex gap-3 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-zinc-800' : 'text-zinc-300 hover:text-zinc-100'}`
              }
              end
            >
              Home
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 ${isActive ? 'bg-zinc-800' : 'text-zinc-300 hover:text-zinc-100'}`
              }
            >
              History
            </NavLink>
          </nav>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/tasks/:taskId" element={<TaskView />} />
      </Routes>
    </Shell>
  )
}
