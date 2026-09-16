# iOS prerelease QA — September 16, 2026

## Decision

The local-first release candidate has been built and exercised in iOS Simulator. This is not approval for public release: the previously reported physical-iPhone startup stall still needs a successful run of the final signed build on that phone. Simulator evidence cannot close that issue.

Scope: Anchor 1.0 (3), bundle `app.anchor.ritual`, branch `TargiX/ios-release-readiness`, based on `fce9e5a` plus the fixes described below. No App Store upload or public release was performed.

## Bugs fixed during this audit

1. **Local users could not open Settings.** The Today gear routed guests to login, and Settings lived behind the authenticated layout. Settings now belongs to the ordinary app layout and is available without an account. Habits, appearance, reminders and backups remain local features. Optional sign-in is shown only when auth is configured.
2. **Legal-page Back control overlapped the status area on notched iPhones.** The failing iPhone 17 Pro accessibility frame was at y=32, while the same flow passed on iPhone SE. The native viewport now includes safe-area padding. Legal/support Back links use a single accessible element with a 44-point minimum height and return to Settings in the native build.
3. **Settings accessibility and notification guidance.** Added names to the habit composer/add control, selected state to theme controls, labels for reminder times, larger delete targets, and native notification instructions. Added Support, Privacy and Terms links.

4. **Settings overflow after habit entry.** The habit input could force its flex row wider than a phone, and its small font invited iOS input zoom. It now allows shrinking and uses a 16px font; reminder time inputs also use 16px. Added an assertion that theme controls remain within the viewport after habit entry.

The UI tests also needed correction: WebKit exposes `aria-pressed` controls as switches, and a text field can appear hittable while covered by the fixed bottom navigation. Tests now scroll relevant inputs into view before typing. These test failures were not reported as app fixes.

## Verification

Final results and artifact paths are recorded below. All artifacts are local and live under the gitignored `.context` directory.

- Unit tests: **260 passed across 31 files** (`release-verified-unit.log`).
- ESLint and TypeScript: passed (`release-verified-lint.log`, `release-verified-types.log`); repeated after the final layout change as noted below.
- Web production build and route contract: passed (`release-verified-web-build.log`).
- Bundled native build and contract: passed (`release-layout-sync.log`).
- Release simulator build: passed (`release-layout-build.log`).
- Signed device archive: passed (`Anchor-Release-Verified.xcarchive`, `release-verified-archive.log`).
- App Store distribution export: passed (`anchor-release-verified-export/App.ipa`, `release-verified-export.log`). Export does not mean App Store validation or upload.

## Remaining release gates

- **Physical-device launch:** reproduce cold launch, background/foreground and relaunch with the final signed build. The earlier black device screenshots were not valid UI proof; no further startup fix is claimed here.
- **Native permissions and delivery:** actual speech recognition, denied/re-enabled microphone/speech permissions, interruptions, and notification delivery while backgrounded need physical-device checks. The simulator verifies that opening the composer does not start recording.
- **Backup roundtrip:** automated file-level safety and cancellation tests do not prove the complete user workflow through the iOS Files picker. Export, import, preview and restore on a physical device remain to be verified with synthetic records.
- **Offline and accessibility:** bundled local storage is exercised, but airplane-mode operation, VoiceOver navigation and large Dynamic Type have not received a complete device audit.
- **Store setup:** final available listing name, App Store app record, screenshots, privacy questionnaire and TestFlight processing are not established by the archive/export result.
- **Cloud scope:** Supabase public URL/key are empty in this candidate. Account creation/sync are not validated for this build. If enabling accounts, validate real sign-in, sync/recovery and in-app account deletion before release; Apple requires apps supporting account creation to offer deletion initiation in the app ([Apple requirement](https://developer.apple.com/support/offering-account-deletion-in-your-app)).

Public privacy/support endpoints returned HTTP 200 and contained their expected page text during this audit. This does not certify their future availability or all external integrations.

## Data-failure exercise

On the task-owned iPhone SE simulator, the native archive was backed up and replaced with deliberately invalid JSON while Anchor was stopped. Anchor displayed “Your journal couldn’t be opened” and the recovery controls. The damaged bytes remained exactly unchanged after launch; the valid fixture was then restored. Evidence: `release-corrupt-journal.png`, `release-corrupt-journal-ocr.txt`, `small-journal-before-corruption.json`. No physical-device data was modified.

## Simulator matrix

| Device | OS | Evidence |
| --- | --- | --- |
| iPhone 17 Pro | iOS 27.0 | `release-complete-ui.xcresult`: all 11 UI scenarios passed, six native file tests passed, one device-only protection test skipped. |
| iPhone SE (3rd generation) | iOS 26.5 | Startup/settings passed in `release-small-final.xcresult`; rotation passed in `release-small-save-retry.xcresult`; corrected save/relaunch passed in `release-small-save-verified.xcresult`. Earlier failed attempts remain available in their result bundles. |
| iPad mini (A17 Pro) | iOS 27.0 | Startup/settings passed in `release-ipad-final.xcresult`; rotation passed in `release-ipad-save-verified.xcresult`. |

The complete iPhone suite includes draft retention, editing, deletion/undo, save/relaunch, journal recovery, Review-to-source navigation, morning/evening rituals, focus start/pause/return, themes/habits, backup cancellation and no automatic recording. It ran before the last settings-only width/font correction; follow-up settings runs exercise that correction.

### Final settings and storage follow-ups

- iPhone 17 Pro: final Settings test passed (`release-phone-layout.xcresult`), including post-entry viewport bounds and legal-page return.
- iPhone SE: final Settings test and journal restoration after moving aside `Library/WebKit` both passed (`release-small-eviction-layout.xcresult`). The native journal was retained. `small-webkit-before-eviction` preserves the old simulator WebKit directory for diagnosis.
- iPad mini: final Settings and save/relaunch tests both passed (`release-ipad-layout.xcresult`), including viewport bounds and exact persisted note text. The run completed with zero failures despite the automation waits described below.
- Final Settings screenshot on SE: `release-small-verified-images/06366AF1-FEAA-44D9-B622-FC8626969EF6.png`; visually inspected with no right-edge clipping.
- Lint and TypeScript were repeated after the final settings adjustment and passed (`release-layout-lint.log`, `release-layout-types.log`).

## Candidate handoff

Final IPA: `.context/anchor-release-verified-export/App.ipa`.

SHA-256: `7df357239759b403bafcd8f6084dc50735c6cd11793939bd08eb69ce90937f7a`.

Ordinary launch of the final simulator build also displayed Today outside XCTest; screenshot `release-verified-today.png` was visually inspected. The candidate contains synthetic QA records only in the simulators, not in the bundled app.

Changes remain in this workspace. This audit did not merge a PR, publish web changes, upload to TestFlight or submit for review.

The iPad iOS 27 XCTest run repeatedly logged “App animations complete notification not received” and `kAXErrorServerNotFound` while interacting with its keyboard, introducing 60-second automation waits. Screenshots showed the composer and the keyboard dismissal. These timings are not a measured app-performance result. The older failed iPad save attempts used an iPhone-only keyboard dismissal and tapped a control behind the keyboard; the final test explicitly uses the iPad “Hide keyboard” control.

## Dependency-security finding — unresolved

`npm audit --omit=dev` reported **17 affected package nodes: 1 critical, 9 high, 4 moderate, 3 low** (`release-dependency-audit.json`). This is an advisory inventory, not 17 demonstrated exploits. It includes build/CLI dependencies currently declared as production dependencies.

The direct Next.js dependency is 16.2.7. Its critical advisories include [AVIF image-optimizer remote code execution](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) and [Windows-hosted server remote code execution](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36); the upstream fixes begin at 16.3.3. npm suggests 16.3.5. PostCSS 8.5.15 is also explicitly pinned via an override and has outstanding advisories, so updating Next alone does not establish a clean dependency tree.

Exposure distinction: `next.config.mjs` uses static export and unoptimized images for the native build; no Next.js Node server runs inside the IPA. The two critical server paths therefore do not run in this native package. The web build retains server behavior; its live exposure was not penetration-tested. **Do not mark web security approved.** Before a new web deployment, update Next/eslint-config-next together, update the PostCSS dependency/override, resolve remaining transitive findings, then repeat audit, both build contracts and regression tests. Dependency upgrades were not mixed into this UI/storage verification, and no claim is made that these findings were fixed.

## UI/UX polish pass (same day, later)

A full-app visual and interaction pass was applied on top of the fixes above, verified in Simulator on iPhone 17 Pro (iOS 26.5), iPhone SE 3rd gen (iOS 27.0) and iPad mini A17 Pro (iOS 27.0). Evidence: `.context/polish-shots/` (`before/`, `final-17pro/`, `final-se/`, `final-ipad/`), exercised end-to-end by the new `PolishShots` UI walkthrough.

Problems found in the installed build and fixed:

1. **Composer buried on Today.** The hero, ritual row and intention card pushed the Save control below the fold even on iPhone 17 Pro. The composer now leads the page directly under a compact hero, the intention card is a slim strip, and ritual entries follow the composer.
2. **Every full-height page overflowed by the safe-area inset.** `min-h-dvh` did not account for `body.native-app` top padding, so ritual/focus/legal screens forced a small overscroll and bottom-pinned actions landed under the home indicator. Added a shared `min-h-app` utility (`100dvh` minus safe-area insets; a no-op on web) and applied it broadly.
3. **Morning ritual step 0 trapped the user.** No exit control existed before "Begin the ritual"; only force-quit or writing state. A Back button now mirrors the evening ritual's pattern.
4. **Sub-44pt touch targets.** `Button` defaulted to 32px heights (h-8/icon size-8) and `TabsList` to h-8. Both now enforce `pointer-coarse:min-h-11`/`min-w-11`, so touch devices get ≥44pt while desktop pointer-fine layouts are unchanged. The affirmation "another one" control also gained a 44px minimum.
5. **Reduce Motion gaps.** RitualShell step transitions, RitualComplete entrance and affirmation regeneration animated transforms unconditionally; all now fall back to opacity-only under `prefers-reduced-motion`.
6. **Journal readability.** Entry text moved to `text-base leading-7`; the collapsed-day "1 habits" pluralization bug was fixed; the deletion/Undo notice was raised clear of the bottom navigation.
7. **Breathing page overflow.** The card exceeded the viewport, hiding the Start control; mobile spacing and the breathing circle were compacted (`sm:` sizes unchanged), so the full exercise fits iPhone 17 Pro and still scrolls gracefully on SE.
8. **Copy and nesting.** Removed duplicated composer footers and "local-first" jargon; backup copy now says "this device" (was "this iPhone", wrong on iPad).

Verified in Simulator:

- `PolishShots` walkthrough (Today top/composer/keyboard, Journal collapsed/expanded, Review, morning ritual Back, breathing, all three Settings tabs, dark→sepia→light themes) — **passed on all three devices**.
- Full smoke suite on iPhone 17 Pro — 18/19 passed, 1 skipped. `testRestoreExistingJournal` failed only in alphabetical full-suite order: it asserted a `Simulator check-in` note that `testSaveSurvivesRelaunch` creates later in the same order. This data-order dependency was subsequently removed — see "Follow-up hardening" below.
- Keyboard: field scrolls into view on both iPhones; iPad uses its "Hide keyboard" control; dismissal verified in the walkthrough.
- No horizontal overflow observed on iPhone SE (375pt) in any captured screen.

Not verified / known limitations:

- On iPhone SE the breathing CTA sits one short scroll below the fold; acceptable on a 667pt screen.
- Physical-device behavior, dictation accuracy and notification delivery remain per the earlier caveats above.

## Follow-up hardening (same day, later still)

Three previously noted limitations were fixed:

1. **Keyboard resize.** `@capacitor/keyboard@8.0.5` added with `resize: "native"` / `resizeOnFullScreen` in `capacitor.config.ts`. The WKWebView now shrinks above the keyboard; the focused field and bottom navigation remain visible and reachable. Verified on iPhone 17 Pro walkthrough (keyboard-open capture).
2. **Test-order dependency removed.** `CheckInTests.testRestoreExistingJournal` no longer relies on `testSaveSurvivesRelaunch` running first — it writes its own `Simulator check-in` marker, relaunches, and verifies restore. Passes standalone.
3. **Dependency audit cleared.** `npm audit` now reports **0 vulnerabilities** (was 17 nodes incl. dev; 12 in `--omit=dev`). Changes:
   - `next` 16.2.7 → **16.3.4**, `eslint-config-next` 16.2.7 → **16.3.4** (fixes the critical advisories; 16.3.5 was 5 days old at the time so 16.3.4 was chosen per the ≥7-day preference).
   - `shadcn` moved from `dependencies` to `devDependencies` (4.7.0 → 4.21.0) — it is a component-generation CLI, never imported by runtime code; this removed the vulnerable MCP/express/hono subtree from the shipped dependency graph.
   - `postcss` override 8.5.15 → **8.5.28**; `vitest` ^4.1.7 → **^4.1.11**.
   - `overrides` added for transitive fixes, all within parent semver ranges: `baseline-browser-mapping ^2.11.24`, `tar ^7.5.22`, `@xmldom/xmldom ^0.9.12`, `js-yaml ^4.3.2`, `browserslist 4.28.9`, `@babel/core ^7.29.7`, `@modelcontextprotocol/sdk ^1.30.0`, `hono 4.13.7`, `@hono/node-server ^1.19.17`, `body-parser ^2.3.0`, `ip-address 10.7.0`, `qs ^6.16.0`, `postcss-selector-parser ^7.1.6`, `fast-uri 3.1.7`, and scoped `brace-expansion` fixes via `minimatch@3`/`minimatch@10`. Exact pins were used where the next published version was under 7 days old.
   - Gate re-run after upgrades: typecheck, lint, 260 unit tests, web build and native build all pass on Next 16.3.4.
   - **Tooling caveat:** npm 10.9.8 (bundled with node 24) crashes re-resolving this dependency set (`Cannot read properties of null (reading 'edgesOut')` — an arborist bug in the vitest 4.1.11 peer graph). `npm install`/`npm ci` against the committed lockfile works fine on npm 10; for future dependency changes use npm 11+ (`npx npm@11 install`).

The dependency-security finding recorded earlier in this document is therefore **resolved**, including for the web build's dependency tree (a web deployment still needs its own review before approval — see above).
