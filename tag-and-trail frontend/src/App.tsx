import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SignupModal from './components/SignupModal';
import LoginModal from './components/LoginModal';
import { GridBackground } from './components/ui/GridBackground';
const AppContent = () => {
  const location = useLocation();
  const isSignup = location.pathname === '/signup';
  const isLogin = location.pathname === '/login';

  return (
    <>
      <GridBackground />
      <LandingPage />
      {isSignup && <SignupModal />}
      {isLogin && <LoginModal />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/signup" element={<AppContent />} />
          <Route path="/login" element={<AppContent />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
