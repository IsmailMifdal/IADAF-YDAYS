"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (offline page, installable app). Production builds only:
 * in development a worker would outlive code changes and mask them.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Without the worker the site works the same, minus the offline page.
    });
  }, []);
  return null;
}
