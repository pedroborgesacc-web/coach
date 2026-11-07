import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import RestTimer from './components/RestTimer'
import { useApplyTheme, useHydrated } from './lib/hooks'
import DayPage from './pages/DayPage'
import TrainingPage from './pages/TrainingPage'
import ProgressPage from './pages/ProgressPage'
import PrepPage from './pages/PrepPage'
import MorePage from './pages/MorePage'

export default function App() {
  useApplyTheme()
  const hydrated = useHydrated()
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh text-slate-900 dark:text-slate-100">
      <main className="mx-auto max-w-lg px-4 pb-40 pt-safe">
        {hydrated ? (
          <Routes>
            <Route path="/" element={<DayPage />} />
            <Route path="/dia/:id" element={<DayPage />} />
            <Route path="/treino" element={<TrainingPage />} />
            <Route path="/treino/:id" element={<TrainingPage />} />
            <Route path="/progresso" element={<ProgressPage />} />
            <Route path="/prep" element={<PrepPage />} />
            <Route path="/prep/:tab" element={<PrepPage />} />
            <Route path="/mais" element={<MorePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <div className="grid h-[60vh] place-items-center muted">A carregar…</div>
        )}
      </main>
      <RestTimer />
      <BottomNav path={pathname} />
    </div>
  )
}
