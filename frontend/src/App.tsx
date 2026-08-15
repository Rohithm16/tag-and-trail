import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthenticationDialog } from './components/auth/AuthenticationDialog';
import { AppBackground } from './components/layout/AppBackground';
import { AuthProvider } from './context/AuthProvider';
import { AuthenticatedRoute } from './routes/AuthenticatedRoute';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { TrashPage } from './pages/TrashPage';
import { SettingsPage } from './pages/SettingsPage';
import { HomePage } from './pages/HomePage';

const AppContent = () => {
  const location = useLocation();
  const authMode =
    location.pathname === '/signup' ? 'signup'
    : location.pathname === '/login' ? 'signin'
    : null;
    

  return (
    <>
      <AppBackground />
      <HomePage />
      {authMode && <AuthenticationDialog mode={authMode} />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<AppContent />} />
          <Route path="/signup" element={<AppContent />} />
          <Route path="/login" element={<AppContent />} />

          {/* Authenticated */}
          <Route element={<AuthenticatedRoute><Layout /></AuthenticatedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;