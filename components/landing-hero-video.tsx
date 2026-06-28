"use client"

import { useEffect, useRef, useState } from "react"

const NATURAL_HERO_PLAYBACK_RATE = 10 / 7

export function LandingHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.defaultPlaybackRate = NATURAL_HERO_PLAYBACK_RATE
    video.playbackRate = NATURAL_HERO_PLAYBACK_RATE

    const markReady = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        setVideoReady(true)
      }
    }

    markReady()
    video.addEventListener("loadeddata", markReady)
    video.addEventListener("canplay", markReady)
    video.addEventListener("playing", markReady)

    return () => {
      video.removeEventListener("loadeddata", markReady)
      video.removeEventListener("canplay", markReady)
      video.removeEventListener("playing", markReady)
    }
  }, [])

  return (
    <div
      className={
        videoReady
          ? "landing-hero__media landing-hero__media--video-ready"
          : "landing-hero__media"
      }
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="landing-hero__video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/landing/hero-background.png"
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        onError={() => setVideoReady(false)}
      >
        <source src="/landing/hero-background-video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}
