import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers for debugging
window.addEventListener('unhandledrejection', (event) => {
  // Only log non-trivial errors, suppress browser feature detection failures
  if (event.reason && typeof event.reason === 'object' && event.reason.message) {
    if (!event.reason.message.includes('Speech recognition') && 
        !event.reason.message.includes('webkitSpeechRecognition')) {
      console.warn('Unhandled promise rejection:', event.reason);
    }
  }
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
