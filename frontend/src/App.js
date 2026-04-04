import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CheckInPage from './pages/CheckInPage';
import RoomDetailPage from './pages/RoomDetailPage';
import GallaPage from './pages/GallaPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import FormCPage from './pages/FormCPage';
import WhatsAppPage from './pages/WhatsAppPage';
import MenuPage from './pages/MenuPage';
import '@/App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-500 font-bold">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {children}
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/checkin/:roomNumber" element={<ProtectedRoute><CheckInPage /></ProtectedRoute>} />
      <Route path="/room/:roomNumber" element={<ProtectedRoute><RoomDetailPage /></ProtectedRoute>} />
      <Route path="/galla" element={<ProtectedRoute><AppLayout><GallaPage /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><OwnerDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/formc" element={<ProtectedRoute><AppLayout><FormCPage /></AppLayout></ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute><AppLayout><WhatsAppPage /></AppLayout></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><AppLayout><MenuPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
