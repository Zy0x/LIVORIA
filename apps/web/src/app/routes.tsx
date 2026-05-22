import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import PWAManager from "@/components/PWAManager";
import { AnimeGridSkeleton, DashboardSkeleton, ObatSkeleton, SettingsSkeleton, TagihanSkeleton, WaifuSkeleton } from "@/components/PageSkeleton";
import SplashScreen from "@/components/SplashScreen";
import { useAuth } from "@/hooks/useAuth";
import { useWatchedAutoRemove } from "@/hooks/useWatchedAutoRemove";
import LoadingState from "@/shared/components/LoadingState";
import RouteErrorBoundary from "@/shared/components/RouteErrorBoundary";
import { ROUTES } from "@/app/route-paths";

const Auth = lazy(() => import("@/route-pages/Auth"));
const Dashboard = lazy(() => import("@/route-pages/Dashboard"));
const Tagihan = lazy(() => import("@/route-pages/Tagihan"));
const Anime = lazy(() => import("@/route-pages/Anime"));
const Donghua = lazy(() => import("@/route-pages/Donghua"));
const Waifu = lazy(() => import("@/route-pages/Waifu"));
const Obat = lazy(() => import("@/route-pages/Obat"));
const Settings = lazy(() => import("@/route-pages/Settings"));
const Admin = lazy(() => import("@/route-pages/Admin"));
const NotFound = lazy(() => import("@/route-pages/NotFound"));

interface RouteShellProps {
  children: ReactNode;
  fallback: ReactNode;
  name: string;
}

function RouteShell({ children, fallback, name }: RouteShellProps) {
  return (
    <RouteErrorBoundary fallback={fallback} name={name}>
      {children}
    </RouteErrorBoundary>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState fullScreen label="Memeriksa sesi..." />;
  if (!user) return <Navigate to={ROUTES.AUTH} replace />;
  return <>{children}</>;
}

function GlobalEffects() {
  useWatchedAutoRemove();
  return null;
}

const routeSegment = (route: string) => route.replace(/^\//, "");

export function AppRoutes() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <PWAManager />
      <BrowserRouter>
        <Suspense fallback={<LoadingState fullScreen label="Memuat aplikasi..." />}>
          <Routes>
            <Route path={ROUTES.AUTH} element={<RouteShell name="auth" fallback={<LoadingState fullScreen label="Memuat halaman masuk..." />}><Auth /></RouteShell>} />
            {/* Admin uses its own sessionStorage check; lives outside ProtectedRoute by design */}
            <Route path={ROUTES.ADMIN} element={<RouteShell name="admin" fallback={<LoadingState fullScreen label="Memuat admin panel..." />}><Admin /></RouteShell>} />
            <Route path={ROUTES.HOME} element={<ProtectedRoute><GlobalEffects /><Layout /></ProtectedRoute>}>
              <Route index element={<RouteShell name="dashboard" fallback={<DashboardSkeleton />}><Dashboard /></RouteShell>} />
              <Route path={routeSegment(ROUTES.DASHBOARD)} element={<RouteShell name="dashboard" fallback={<DashboardSkeleton />}><Dashboard /></RouteShell>} />
              <Route path={routeSegment(ROUTES.TAGIHAN)} element={<RouteShell name="tagihan" fallback={<TagihanSkeleton />}><Tagihan /></RouteShell>} />
              <Route path={routeSegment(ROUTES.ANIME)} element={<RouteShell name="anime" fallback={<AnimeGridSkeleton />}><Anime /></RouteShell>} />
              <Route path={`${routeSegment(ROUTES.ANIME)}/:pageParam`} element={<RouteShell name="anime" fallback={<AnimeGridSkeleton />}><Anime /></RouteShell>} />
              <Route path={routeSegment(ROUTES.DONGHUA)} element={<RouteShell name="donghua" fallback={<AnimeGridSkeleton />}><Donghua /></RouteShell>} />
              <Route path={`${routeSegment(ROUTES.DONGHUA)}/:pageParam`} element={<RouteShell name="donghua" fallback={<AnimeGridSkeleton />}><Donghua /></RouteShell>} />
              <Route path={routeSegment(ROUTES.WAIFU)} element={<RouteShell name="waifu" fallback={<WaifuSkeleton />}><Waifu /></RouteShell>} />
              <Route path={`${routeSegment(ROUTES.WAIFU)}/:pageParam`} element={<RouteShell name="waifu" fallback={<WaifuSkeleton />}><Waifu /></RouteShell>} />
              <Route path={routeSegment(ROUTES.OBAT)} element={<RouteShell name="obat" fallback={<ObatSkeleton />}><Obat /></RouteShell>} />
              <Route path={`${routeSegment(ROUTES.OBAT)}/:pageParam`} element={<RouteShell name="obat" fallback={<ObatSkeleton />}><Obat /></RouteShell>} />
              <Route path={routeSegment(ROUTES.SETTINGS)} element={<RouteShell name="settings" fallback={<SettingsSkeleton />}><Settings /></RouteShell>} />
              <Route path="*" element={<RouteShell name="not found" fallback={<LoadingState label="Memuat halaman..." />}><NotFound /></RouteShell>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}
