import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGSAPReducedMotion } from "@/hooks/useReducedMotion";
import { installChunkRecoveryHandlers } from "@/services/platform/chunkRecovery";

installChunkRecoveryHandlers();
initGSAPReducedMotion();

createRoot(document.getElementById("root")!).render(<App />);

// Service Worker registration is handled by the Next root layout in production.
// This ensures SW is registered before React bundle loads, preventing race conditions
