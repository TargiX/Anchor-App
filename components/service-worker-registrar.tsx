"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Native builds run from a custom scheme / local WebView; a service
    // worker there would cache stale exported assets. Cleanup must run
    // before the protocol guard — a native WebView is exactly the case
    // where a stale registration needs removing.
    const swDisabled =
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_NATIVE_BUILD === "true"

    if (swDisabled) {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister())
            )
          )
      }

      if ("caches" in window) {
        void caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      }

      return
    }

    if (!("serviceWorker" in navigator)) return
    if (!["http:", "https:"].includes(window.location.protocol)) return

    void navigator.serviceWorker.register("/sw.js", { scope: "/" })
  }, [])

  return null
}
