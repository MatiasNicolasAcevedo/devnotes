import { Navigate, Route, Routes } from 'react-router'
import { AuthSessionProvider } from '../features/auth/AuthSessionProvider'
import { DailyNotesPage } from '../features/daily/DailyNotesPage'
import { DailyHistoryPage } from '../features/daily/DailyHistoryPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DataPage } from '../features/portability/DataPage'
import { ReferencePage } from '../features/reference/ReferencePage'
import { VoicePage } from '../features/voice/VoicePage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

/** Rutas en modo declarativo, bajo la sesión. Las pantallas de negocio se agregan como rutas hijas del shell. */
export function AppRoutes() {
  return (
    <AuthSessionProvider>
      <Routes>
        <Route element={<AppShell />}>
          {/* Sin pantalla de inicio: la aplicación abre en Notas, también para un visitante. */}
          <Route index element={<Navigate to="/notes" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="notes" element={<DailyNotesPage />} />
          <Route path="notes/:date" element={<DailyNotesPage />} />
          <Route path="history" element={<DailyHistoryPage />} />
          <Route path="history/:date" element={<DailyHistoryPage />} />
          <Route path="reference" element={<ReferencePage />} />
          <Route path="voice" element={<VoicePage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthSessionProvider>
  )
}
