# Anchor Web/PWA + TestFlight Beta Release Checklist

Date: 2026-06-07

## Release target

- Public Web/PWA release first.
- iOS TestFlight beta for selected testers.
- App Store public release waits until beta feedback is reviewed.

## Repository readiness

- Release branch: `release/anchor-beta`.
- Source branches merged into release candidate:
  - `origin/feat/production-rebuild` for native/PWA/product work.
  - CI workflow content from `27ac184`, already present in the release branch.
- Keep `.vercel/` local-only; do not commit Vercel project metadata.

## Web/PWA

- Vercel project: `next-js-tether`.
- Required checks:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - Production smoke on the deployed URL:
    - `/` loads.
    - `/app` opens.
    - Morning flow completes.
    - Evening flow completes.
    - `/timeline` shows saved data.
    - Reload/reopen preserves local data.
    - `/manifest.webmanifest` returns JSON.
    - `/sw.js` returns JavaScript.
    - Chromium shows the install affordance.

## TestFlight

- Apple Developer Program: required before TestFlight distribution.
- App Store Connect default metadata:
  - Name: `Anchor`
  - Bundle ID: `app.anchor.ritual`
  - Category: `Lifestyle`
  - Privacy Policy URL: deployed `/privacy`
  - Support URL: deployed `/support`
- Internal beta metadata:
  - Beta description: `Anchor is a quiet local-first daily ritual app for morning and evening reflection.`
  - Features to test: morning ritual, evening ritual, timeline persistence, settings, iOS local reminders.
  - Feedback email: `targix8@gmail.com`
- iOS smoke:
  - Archive/upload succeeds.
  - Install via TestFlight succeeds.
  - Safe area, keyboard inputs, navigation, persistence, settings, and reminders work.

## Promotion

- Use the live web URL as the first public link.
- Use TestFlight for 10-20 selected beta testers.
- LinkedIn first comment: `Live: <url> · TestFlight beta: email targix8@gmail.com`.
- Ask testers:
  - Did they complete morning/evening flow?
  - Did they come back the next day?
  - Was local-only storage clear?
  - Do they need sync, export, or stronger reminders?
