import { ReactNode, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingState from './LoadingState';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

export default function RouteErrorBoundary({ children, fallback, name }: RouteErrorBoundaryProps) {
  const location = useLocation();
  const { reset } = useQueryErrorResetBoundary();
  const boundaryKey = `${location.pathname}${location.search}`;

  return (
    <ErrorBoundary key={boundaryKey} scope="route" onReset={reset}>
      <Suspense fallback={fallback || <LoadingState label={`Memuat ${name || 'halaman'}...`} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
