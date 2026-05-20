import { Toaster } from "@/components/ui/toaster";
import PWAManager from '@/components/PWAManager';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState, useCallback, lazy, Suspense } from "react";
import SplashScreen from "@/components/SplashScreen";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useWatchedAutoRemove } from "@/hooks/useWatchedAutoRemove";
import { AnimeGridSkeleton, DashboardSkeleton, TagihanSkeleton, WaifuSkeleton, ObatSkeleton, SettingsSkeleton } from "@/components/PageSkeleton";
import LoadingState from "@/shared/components/LoadingState";
import RouteErrorBoundary from "@/shared/components/RouteErrorBoundary";

// Lazy load pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tagihan = lazy(() => import("./pages/Tagihan"));
const Anime = lazy(() => import("./pages/Anime"));
const Donghua = lazy(() => import("./pages/Donghua"));
const Waifu = lazy(() => import("./pages/Waifu"));
const Obat = lazy(() => import("./pages/Obat"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min - reduce refetches on navigation
      gcTime: 30 * 60 * 1000, // 30 min cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteShell({ children, fallback, name }: { children: React.ReactNode; fallback: React.ReactNode; name: string }) {
  return (
    <RouteErrorBoundary fallback={fallback} name={name}>
      {children}
    </RouteErrorBoundary>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState fullScreen label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Mount global side effects (auto-remove watched items) once for the entire app
function GlobalEffects() {
  useWatchedAutoRemove();
  return null;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <PWAManager />
      <BrowserRouter>
        <Suspense fallback={<LoadingState fullScreen label="Memuat aplikasi..." />}>
          <Routes>
            <Route path="/auth" element={<RouteShell name="auth" fallback={<LoadingState fullScreen label="Memuat halaman masuk..." />}><Auth /></RouteShell>} />
            {/* Admin uses its own sessionStorage check; lives outside ProtectedRoute by design */}
            <Route path="/admin" element={<RouteShell name="admin" fallback={<LoadingState fullScreen label="Memuat admin panel..." />}><Admin /></RouteShell>} />
            <Route path="/" element={<ProtectedRoute><GlobalEffects /><Layout /></ProtectedRoute>}>
              <Route index element={<RouteShell name="dashboard" fallback={<DashboardSkeleton />}><Dashboard /></RouteShell>} />
              <Route path="tagihan" element={<RouteShell name="tagihan" fallback={<TagihanSkeleton />}><Tagihan /></RouteShell>} />
              <Route path="anime" element={<RouteShell name="anime" fallback={<AnimeGridSkeleton />}><Anime /></RouteShell>} />
              <Route path="anime/:pageParam" element={<RouteShell name="anime" fallback={<AnimeGridSkeleton />}><Anime /></RouteShell>} />
              <Route path="donghua" element={<RouteShell name="donghua" fallback={<AnimeGridSkeleton />}><Donghua /></RouteShell>} />
              <Route path="donghua/:pageParam" element={<RouteShell name="donghua" fallback={<AnimeGridSkeleton />}><Donghua /></RouteShell>} />
              <Route path="waifu" element={<RouteShell name="waifu" fallback={<WaifuSkeleton />}><Waifu /></RouteShell>} />
              <Route path="waifu/:pageParam" element={<RouteShell name="waifu" fallback={<WaifuSkeleton />}><Waifu /></RouteShell>} />
              <Route path="obat" element={<RouteShell name="obat" fallback={<ObatSkeleton />}><Obat /></RouteShell>} />
              <Route path="obat/:pageParam" element={<RouteShell name="obat" fallback={<ObatSkeleton />}><Obat /></RouteShell>} />
              <Route path="settings" element={<RouteShell name="settings" fallback={<SettingsSkeleton />}><Settings /></RouteShell>} />
              <Route path="*" element={<RouteShell name="not found" fallback={<LoadingState label="Memuat halaman..." />}><NotFound /></RouteShell>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
