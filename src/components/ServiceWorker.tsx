"use client";
import { useEffect } from "react";

/**
 * Registers the offline service worker (public/sw.js), in production only: in development
 * cached pages would hide your code changes. Renders nothing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
