import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGSAPReducedMotion } from "@/hooks/useReducedMotion";

initGSAPReducedMotion();

createRoot(document.getElementById("root")!).render(<App />);

// ✅ Service Worker registration moved to index.html for earlier initialization
// This ensures SW is registered before React bundle loads, preventing race conditions
