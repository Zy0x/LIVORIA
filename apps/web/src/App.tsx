import ErrorBoundary from "@/components/ErrorBoundary";
import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/routes";

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </ErrorBoundary>
);

export default App;
