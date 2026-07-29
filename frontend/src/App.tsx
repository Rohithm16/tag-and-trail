import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthenticationDialog } from './components/auth/AuthenticationDialog';
import { AppBackground } from './components/layout/AppBackground';
import { AuthProvider } from './context/AuthProvider';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { AuthenticatedRoute } from './routes/AuthenticatedRoute';

const AppContent = () => {
  const location = useLocation();
  const authMode =
    location.pathname === '/signup' ? 'signup' : location.pathname === '/login' ? 'signin' : null;

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
          <Route path="/" element={<AppContent />} />
          <Route path="/signup" element={<AppContent />} />
          <Route path="/login" element={<AppContent />} />
          <Route
            path="/dashboard"
            element={
              <AuthenticatedRoute>
                <DashboardPage />
              </AuthenticatedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
