import "@fontsource-variable/hanken-grotesk/wght.css";
import "@fontsource-variable/newsreader/wght.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./components/components.css";
import { applyTheme } from "./theme/applyTheme";
import { loadRememberedTheme } from "./theme/remember";

// Paint the lock screen in the last used theme before React starts.
applyTheme({ theme: "system", accent: "", density: "comfortable", fontScale: 1, ...loadRememberedTheme() });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);