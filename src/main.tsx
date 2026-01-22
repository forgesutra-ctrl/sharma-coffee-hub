import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress harmless third-party widget errors globally
const originalError = console.error;
const originalWarn = console.warn;

const shouldSuppressError = (message: unknown): boolean => {
  const messageStr = String(message);
  return (
    messageStr.includes('localtesting.com') ||
    messageStr.includes('ERR_NAME_NOT_RESOLVED') ||
    messageStr.includes('SociableKIT_Widgets') ||
    (messageStr.includes('Failed to load') && messageStr.includes('widget.js'))
  );
};

console.error = ((...args: unknown[]) => {
  if (!shouldSuppressError(args[0])) {
    originalError.apply(console, args);
  }
}) as typeof console.error;

console.warn = ((...args: unknown[]) => {
  if (!shouldSuppressError(args[0])) {
    originalWarn.apply(console, args);
  }
}) as typeof console.warn;

// Suppress global error events from widget network failures
const handleError = (event: ErrorEvent) => {
  const message = String(event.message || '');
  const filename = String(event.filename || '');
  if (
    message.includes('localtesting.com') ||
    filename.includes('localtesting.com') ||
    (filename.includes('widget.js') && message.includes('ERR_NAME_NOT_RESOLVED'))
  ) {
    event.preventDefault();
    return false;
  }
  return true;
};

window.addEventListener('error', handleError, true);

// Suppress unhandled promise rejections from widgets
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = String(event.reason || '');
  if (
    reason.includes('localtesting.com') ||
    reason.includes('SociableKIT') ||
    reason.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    event.preventDefault();
  }
};

window.addEventListener('unhandledrejection', handleUnhandledRejection);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);