"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    if (!["http:", "https:"].includes(window.location.protocol)) return

    void navigator.serviceWorker.register("/sw.js", { scope: "/" })
  }, [])

  return null
}
