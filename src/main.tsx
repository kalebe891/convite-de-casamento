import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";

// Register Service Worker for PWA
if ('serviceWorker' in navigator && window.location.pathname.startsWith('/admin')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      if (import.meta.env.DEV) console.warn('SW registration failed:', error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      themes={["light", "brown", "dark"]}
    >
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
