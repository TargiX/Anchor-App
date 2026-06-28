"use client"

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-page")
    if (!root) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reduceMotion.matches) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".landing-card")
      const cardIcons = cards
        .map((card) => card.querySelector<HTMLElement>(".landing-icon"))
        .filter(Boolean)

      gsap.from(cards, {
        autoAlpha: 0,
        y: 76,
        rotateX: -9,
        clipPath: "inset(16% 0% 0% 0% round 10px)",
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: {
          trigger: ".landing-features",
          start: "top 68%",
          toggleActions: "play none none reverse",
        },
      })

      cardIcons.forEach((icon, index) => {
        gsap.from(icon, {
          autoAlpha: 0,
          scale: 0.62,
          rotate: index % 2 === 0 ? -18 : 18,
          duration: 0.8,
          ease: "back.out(1.8)",
          delay: index * 0.08,
          scrollTrigger: {
            trigger: icon,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        })

        gsap.to(icon, {
          y: index % 2 === 0 ? -5 : -3,
          rotate: index % 2 === 0 ? 4 : -4,
          duration: 2.2 + index * 0.18,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: index * 0.16,
        })
      })

      gsap.to(".landing-platforms__image", {
        backgroundPosition: "72% 47%",
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".landing-platforms",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      })

      gsap.from(".landing-platform-row", {
        autoAlpha: 0,
        x: 82,
        rotateY: -12,
        duration: 0.95,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".landing-platform-list",
          start: "top 74%",
          toggleActions: "play none none reverse",
        },
      })

      gsap.utils.toArray<HTMLElement>(".landing-platform-row__icon").forEach((icon, index) => {
        gsap.to(icon, {
          rotate: index % 2 === 0 ? 8 : -8,
          scale: 1.06,
          duration: 1.9 + index * 0.15,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: index * 0.2,
        })
      })

      gsap.from(".landing-chip-list span", {
        autoAlpha: 0,
        y: 26,
        scale: 0.92,
        clipPath: "inset(0% 50% 0% 50% round 999px)",
        duration: 0.72,
        ease: "power3.out",
        stagger: {
          each: 0.045,
          from: "center",
        },
        scrollTrigger: {
          trigger: ".landing-practice",
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      })

      gsap.to(".landing-closing", {
        backgroundPosition: "center 42%",
        ease: "none",
        scrollTrigger: {
          trigger: ".landing-closing",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.9,
        },
      })

      gsap.from(".landing-closing__copy > *", {
        autoAlpha: 0,
        y: 34,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".landing-closing",
          start: "top 74%",
          toggleActions: "play none none reverse",
        },
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return null
}
