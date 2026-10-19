import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { StaffLoginPage } from './pages/auth/StaffLoginPage';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { CreateComplaintPage } from './pages/citizen/CreateComplaintPage';
import { OfficerDashboard } from './pages/officer/OfficerDashboard';
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { WorkOrderDetailPage } from './pages/worker/WorkOrderDetailPage';
import { ResolutionSubmitPage } from './pages/worker/ResolutionSubmitPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-civic-saffron border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-civic-bg-warm flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff/login" element={<StaffLoginPage />} />

          {/* Citizen Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <CreateComplaintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-complaints"
            element={
              <ProtectedRoute>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          {/* Municipal Officer Portal Routes */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Field Worker Portal Routes */}
          <Route
            path="/worker"
            element={
              <ProtectedRoute allowedRoles={['field_worker', 'officer', 'admin']}>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/tasks/:workOrderId"
            element={
              <ProtectedRoute allowedRoles={['field_worker', 'officer', 'admin']}>
                <WorkOrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/tasks/:workOrderId/resolve"
            element={
              <ProtectedRoute allowedRoles={['field_worker', 'officer', 'admin']}>
                <ResolutionSubmitPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Municipal Portal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">CivicPulse — Municipal Civic Operations Platform</p>
          <p>Powered by Groq GPT-OSS, Sarvam AI & OpenStreetMap • Government of India Initiative</p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
