import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import MedicalRecords from "./pages/MedicalRecords";
import BuscaAtiva from "./pages/BuscaAtiva";
import Territory from "./pages/Territory";
import Communication from "./pages/Communication";
import DirectorDashboard from "./pages/DirectorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients"
        element={
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            <AppLayout>
              <Patients />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/appointments"
        element={
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            <AppLayout>
              <Appointments />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/records"
        element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <AppLayout>
              <MedicalRecords />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/busca-ativa"
        element={
          <ProtectedRoute allowedRoles={["nurse"]}>
            <AppLayout>
              <BuscaAtiva />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/territory"
        element={
          <ProtectedRoute allowedRoles={["agent"]}>
            <AppLayout>
              <Territory />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/communication"
        element={
          <ProtectedRoute allowedRoles={["doctor", "nurse", "agent", "director"]}>
            <AppLayout>
              <Communication />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/director-dashboard"
        element={
          <ProtectedRoute allowedRoles={["director"]}>
            <AppLayout>
              <DirectorDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
