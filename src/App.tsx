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

function CenteredSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
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
        <Suspense fallback={<CenteredSpinner />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><GlobalEffects /><Layout /></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense>} />
              <Route path="tagihan" element={<Suspense fallback={<TagihanSkeleton />}><Tagihan /></Suspense>} />
              <Route path="anime" element={<Suspense fallback={<AnimeGridSkeleton />}><Anime /></Suspense>} />
              <Route path="anime/:pageParam" element={<Suspense fallback={<AnimeGridSkeleton />}><Anime /></Suspense>} />
              <Route path="donghua" element={<Suspense fallback={<AnimeGridSkeleton />}><Donghua /></Suspense>} />
              <Route path="donghua/:pageParam" element={<Suspense fallback={<AnimeGridSkeleton />}><Donghua /></Suspense>} />
              <Route path="waifu" element={<Suspense fallback={<WaifuSkeleton />}><Waifu /></Suspense>} />
              <Route path="obat" element={<Suspense fallback={<ObatSkeleton />}><Obat /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense>} />
              {/* Admin is now behind auth — sessionStorage check inside Admin page still applies */}
              <Route path="admin" element={<Suspense fallback={<CenteredSpinner />}><Admin /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFound />} />
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
