import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Suppress harmless third-party widget errors globally
const originalError = console.error;
const originalWarn = console.warn;

const shouldSuppressError = (message: unknown): boolean => {
  const messageStr = String(message);
  return (
    messageStr.includes('localtesting.com') ||
    messageStr.includes('ERR_NAME_NOT_RESOLVED') ||
    messageStr.includes('SociableKIT_Widgets') ||
    (messageStr.includes('Failed to load') && messageStr.includes('widget.js')) ||
    (messageStr.includes('Cannot set properties of undefined') && messageStr.includes('className')) ||
    (messageStr.includes('widget.js') && messageStr.includes('className')) ||
    messageStr.includes('Invalid Refresh Token') ||
    messageStr.includes('Refresh Token Not Found')
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
    (filename.includes('widget.js') && message.includes('ERR_NAME_NOT_RESOLVED')) ||
    (filename.includes('widget.js') && message.includes('Cannot set properties of undefined')) ||
    (filename.includes('widget.js') && message.includes('className'))
  ) {
    event.preventDefault();
    return false;
  }
  return true;
};

window.addEventListener('error', handleError, true);

// Suppress unhandled promise rejections from widgets; clear session when refresh token is invalid
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const msg = reason?.message ?? String(reason ?? '');
  if (
    msg.includes('Invalid Refresh Token') ||
    msg.includes('Refresh Token Not Found') ||
    msg.includes('refresh_token')
  ) {
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    event.preventDefault();
  }
  if (
    msg.includes('localtesting.com') ||
    msg.includes('SociableKIT') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
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