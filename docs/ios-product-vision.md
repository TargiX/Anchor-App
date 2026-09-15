# Anchor: iOS product vision and delivery plan

Research date: 2026-09-15. Status: historical research and superseded proposal.

> Current implementation scope and release strategy live in
> [product-direction.md](product-direction.md). The owner subsequently rejected
> the narrow overwhelm positioning and pre-launch test-group, interview, and
> pricing-experiment requirements. Those proposals below are retained only as
> research history and must not be treated as current delivery instructions.

## 1. Recommendation

Build Anchor around a short recovery loop: **say what is on your mind, choose one manageable next step, and return without catching up**. Morning and evening provide familiar entry points; an interrupted or overwhelming day is the strongest proposed use case.

Positioning hypothesis: “A quiet place to clear your head and find your next step.” Target adults who repeatedly abandon journals and detailed planners, including people who identify with executive-function difficulties. Do not require a diagnosis or market clinical treatment.

Voice, AI summaries, and weekly insights already exist elsewhere. Differentiation must come from the complete experience: short sessions, editable interpretation, useful action, easy re-entry, and trustworthy data handling. This is a hypothesis to validate, not demonstrated product-market fit.

## 2. Research method and limits

Reviewed current repository source, official product/help pages, publicly accessible App Store reviews, and specific Reddit discussions. Reviews are a purposive qualitative sample, not a representative dataset. No review-frequency percentages, market-share estimates, paid-account walkthroughs, or clinical efficacy claims are inferred. App Store pages can contain old and platform-specific feedback; a recent crawl does not make every review recent. Marketing claims are distinguished from user reports.

The existing Hermes experiment document provides a hypothesis and success criteria, not evidence that the experiment succeeded. Founder results are still unknown. Competitor prices vary by storefront, offer, and billing channel; proposed Anchor prices below are experiments, not competitor price comparisons.

## 3. Competitive evidence and implications

| Product | Strength supported by sources | Friction or competitive implication | Anchor decision |
|---|---|---|---|
| Daylio | Fast, customizable mood/activity logging; users value a long-term personal record. | User discussion reports confusion about multiple subscription prices. This does not establish current billing defects. | Make capture equally short and pricing understandable. [Reviews](https://apps.apple.com/us/app/daylio-journal-mood-tracker/id1194023242?see-all=reviews), [pricing discussion](https://www.reddit.com/r/Daylio/comments/1hr1jra/) |
| How We Feel | Free emotion vocabulary and accessible mood reflection. | A positive review objects to AI while appreciating that it can be disabled. A mood grid alone offers little differentiation. | Keep meaningful functionality without AI and make cloud interpretation opt-in. [Listing](https://apps.apple.com/us/app/how-we-feel/id1562706384), [reviews](https://apps.apple.com/us/app/how-we-feel/id1562706384?platform=iphone&see-all=reviews) |
| stoic. | Morning/evening structure, calm presentation, AI personalization. | A small August 2026 discussion questions AI-upgrade value and journal privacy. | Rituals plus AI are existing category features; validate a narrower outcome. [Product](https://www.getstoic.com/), [discussion](https://www.reddit.com/r/digitaljournaling/comments/1vghyis/anyone_using_the_ai_features_in_the_stoic_journal/) |
| Finch | Pet attachment and small goals help some reviewers maintain self-care. | Other users describe excessive clicking, obligation, and streak pressure; some appreciate these same motivators. | Serve users who prefer a quiet experience. Do not characterize all gamification as harmful. [Reviews](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748?platform=ipad&see-all=reviews), [August 2026 discussion](https://www.reddit.com/r/FinchAdults/comments/1vi4lbk/does_anyone_else_get_overwhelmed_by_everything/) |
| Rosebud | Voice, remembered context, intentions/reflections, and weekly reports directly overlap with Anchor's prototype. | AI processing has explicit usage limits. A Mac review values feedback but notes subscription expense; an old Mac-only bug is not evidence of a current iPhone problem. | Treat Rosebud as the closest comparator. Compete on bounded action-oriented sessions, not generic AI journaling. [Product](https://www.rosebud.app/), [limits](https://help.rosebud.app/ai-analysis/usage-limits), [reviews](https://apps.apple.com/us/app/rosebud-ai-journal-diary/id6451135127?platform=mac&see-all=reviews) |
| Tiimo | Visual planning and AI transformation of a brain dump into a plan. | Historical App Store feedback requests flexibility and reports reliability problems; it cannot establish today's bug rate. | Own returning to the next step; avoid becoming a second full planner. [Product](https://www.tiimoapp.com/), [reviews](https://apps.apple.com/us/app/tiimo-to-do-list-planner/id1480220328?see-all=reviews) |
| Fabulous | Guided habit-building journeys. | Users report cancellation confusion; official help distinguishes web, Apple, and Google subscriptions. Allegations are not independently verified. | Start with one iOS purchase channel and visible subscription management. [Product](https://www.thefabulous.co/), [reports](https://www.reddit.com/r/ProductivityApps/comments/1s8oln3/if_fabulous_keeps_charging_you_after_cancellation/), [official help](https://help.thefabulous.co/en/support/solutions/articles/101000405804-how-to-manage-a-premium-subscription) |
| Day One / Apple Journal | Day One offers rich capture, export, and end-to-end encryption; Apple documents journal export. | Established alternatives set a high baseline for owning and retrieving personal records. No current defect is claimed here. | Export, recovery, and privacy are foundations rather than premium differentiators. [Day One](https://dayoneapp.com/features/), [Apple export](https://support.apple.com/guide/iphone/print-and-export-entries-iph4cad323fe/26/ios/26) |

Other substitutes: a paper notebook, Notes, Voice Memos, a trusted person, or doing nothing. Interview users about these before assuming they want a subscription app.

## 4. Product contract

### Target job

“When my thoughts are scattered or my day has gone off plan, help me understand what matters now and choose a small next step without maintaining another system.”

### User promise

- A useful session can take 20–40 seconds; this is a design target to measure.
- Typing and one-tap check-ins are first-class paths when speaking is inconvenient.
- Missing days creates no backlog or loss state.
- The user owns the interpretation: suggested emotions and intentions are editable.
- A next step may be rest, contacting someone, changing the plan, or taking no action.
- Entries remain useful without cloud AI or a subscription.

### Explicit exclusions from v1

No general therapy chatbot, diagnosis, ADHD symptom score, social feed, pet economy, task hierarchy, calendar replacement, meditation catalog, or compulsory habit checklist. No passive microphone. No automatic sharing with employers, friends, or clinicians.

## 5. End-state experience

### Today

Three primary destinations: Today, History, Insights. Settings remain accessible to guests. Today contains one current anchor, one capture action, and a secondary “I need a reset” entry point. Large text, restrained motion, accessible contrast, and clear saved/pending/error states take priority over decorative dashboards.

### First session

1. Explain the outcome in one sentence.
2. Offer voice, text, or a quick mood/energy choice.
3. Save locally before optional AI processing.
4. Show a short editable result and a clear finish state.
5. Offer a reminder only after value is experienced.
6. Offer an account when backup/sync is relevant; disclose guest-data recovery limits.

No long personality survey, diagnosis question, mandatory registration, or paywall before first value.

### Morning: choose an anchor

Input: “Slept badly, everything is noisy, need to finish the presentation.”

Result: stated sleep context; proposed anchor “presentation”; optional suggested first step “open the file and write three headings.” Separate extracted facts from generated suggestions. Allow edit, accept, or save without an action. Do not infer sleep duration from vague language.

### Midday: recover

Input: “Got pulled into messages and lost the day.”

Show the current anchor and ask whether to continue, reduce, or replace it. Offer a tiny step or an optional short pause. Breathing is a tool the user chooses, not a prerequisite. Existing Focus/Pulse code is a useful starting point.

### Evening: close

Ask what is worth keeping from today. Offer done / partial / changed plan / skip for the anchor. An unfinished task does not automatically become tomorrow's obligation. Additional journaling is optional.

### After an absence

Open directly into today's state: “Continue from here.” No missed-day count, streak repair, catch-up questions, or upgrade prompt. Test with natural lapses; simulated gaps help usability but do not prove retention.

### Weekly insight

At most three observations and one proposed experiment. Each observation links to source entries and shows dates and sample size. For example, a repeated mention of message interruptions can support a suggestion to try one quiet work block. Do not present correlations as causes or missing check-ins as negative mood.

Cold start: after one entry, provide an accurate summary; after several entries, a retrospective; only offer a pattern when enough relevant observations exist. Proposed initial rule: require at least five relevant entries across several days and show the actual sample. This is a presentation guardrail, not statistical significance. If evidence is weak, say so.

## 6. Current implementation: verified source observations

| Area | Present in this checkout | Work required |
|---|---|---|
| Rituals | Morning flow with six screens including completion; evening with five; mood, sleep, intention, journal, habits, meditation. | Make a short check-in the default; retain longer ritual as optional depth. |
| Recovery | Pulse, Focus, and one-shot context handoff already exist. | Integrate into a single persistent next-step loop. |
| Motivation | Dashboard renders a day streak. | Align UI and selectors with the proposed no-debt model. |
| Native shell | Capacitor 8, iOS project, haptics/status-bar dependencies, native local-notification adapter. | Validate real-device behavior and add missing native boundaries. |
| Voice | Browser SpeechRecognition with ru-RU configuration. | Durable native recording, interruption handling, language tests, transcription contract. |
| Interpretation | Rule/regex-based check-in extraction and generated reflections/digest. | Do not describe this as a production LLM engine; evaluate richer extraction independently. |
| Data | Ritual state uses localStorage and a whole-state Supabase row with sync reconciliation; experimental check-ins use separate JSONL storage. | Unify identity/data model, durable per-entry persistence, migrations, deletion and recovery. |
| API/native boundary | Voice UI calls a relative Next API route; native config uses static export. | A bundled app needs a reachable authenticated service; Node file-backed routes do not run inside the iOS bundle. Build compatibility remains untested. |
| Settings/privacy | Habit/reminder/theme controls; no account-delete action found in the inspected settings; app privacy manifest lists no collected-data entries. | Implement data controls and audit declarations against actual app/SDK behavior. |

Source anchors: `app/(app)/app/page.tsx`, `app/(app)/morning/page.tsx`, `app/(app)/evening/page.tsx`, `components/anchor-voice-checkin-mvp.tsx`, `lib/anchor-checkin/`, `lib/store/cloud.ts`, `lib/notifications/port.ts`, `next.config.mjs`, `ios/App/App/PrivacyInfo.xcprivacy`.

This was a source review, not an Xcode/device test or deployment audit. README/ROADMAP lag the code in places, notably native notifications and sync. No code/build readiness is certified by this document.

## 7. Technical direction

Retain Next.js/Capacitor for the first validated release. Add Swift functionality behind narrow ports where the core experience needs it. Do not start a full rewrite without an observed failure of the existing approach.

| Option | Benefit | Cost / decision |
|---|---|---|
| Capacitor + focused Swift integrations | Reuses current UI and domain code; shortest path to testing. | Requires device work on audio, lifecycle, storage, navigation. Recommended starting point. |
| React Native | Native UI with TypeScript familiarity. | Major UI migration; choose only if native UI constraints are repeatedly blocking. |
| SwiftUI | Direct iOS integration and platform conventions. | Largest rewrite and duplicated web logic. Reassess after validation if product becomes strongly Apple-specific. |

### Vertical slice before broad development

Prove: cold start → capture → local save → app termination → restore → optional remote interpretation → editable result. Also prove notification deep link, guest use, and authenticated API access from an installed build.

### Data model

Use separate records for CheckIn, Anchor, Reflection, and WeeklyInsight, plus account settings and pending operations. Include UUID, owner, timestamp, time zone at creation, local day key, revision, and deletion marker. Reflections retain source-entry IDs, source revision, and generator version. Editing or deleting source data invalidates derived material.

Device storage should have transactions and migrations; use protected files/database and Keychain for credentials. Select the concrete storage adapter after the vertical slice. Cloud records use per-user access enforcement and idempotent mutations. Preserve both versions of conflicting journal text instead of silently overwriting it.

Migrate legacy daily entries without inventing timestamps: preserve day-level precision and origin. Re-running migration must not duplicate records. Provide a pre-migration export and verification by record counts and sampled content.

### AI boundary

Capture → durable local entry → explicit cloud consent → transcription/extraction job → schema validation → editable result. Jobs are idempotent and bounded; timeouts never erase the input. No API secrets in the app. Null is preferable to an invented emotion or fact.

Build an evaluation set of at least 100 consented or synthetic examples across the launch languages: vague replies, negation, sarcasm, mixed language, old versus new intentions, poor transcription, distressed language, and empty input. Track unsupported claims and meaningful corrections separately from transcription quality.

### Privacy architecture

Choose and disclose a coherent first-release model: local-only mode plus optional cloud processing/sync, with transport/storage protection. Do not call this end-to-end encryption if a service reads plaintext. A true encrypted sync mode needs a separate key/recovery design; cloud AI would require a clearly disclosed selective disclosure path.

Audio should be ephemeral by default after successful transcription, unless the user chooses to retain it. Failed transcription keeps a recoverable local draft with retry/delete controls. Entry deletion also removes pending jobs and invalidates summaries. Document backup retention and provider retention before launch. No journal text, transcript, mood content, or audio in analytics/session replay/crash logs.

### iOS scope

v1: safe areas, keyboard behavior, Dynamic Type/VoiceOver, dark mode, reduced motion, audio interruption recovery, offline persistence, local reminders with deep links, biometric lock, share/export, purchase restore/manage, and in-app deletion.

v1.1: widget showing an optional non-sensitive next step and opening capture; App Intents/Shortcuts; optional supported Apple Health context only after demand is established. Do not promise background/lock-screen voice behavior before a device spike. Apple exposes audio-recording intents, but availability and actual UX must be checked for the supported OS/device range. [Apple audio intents](https://developer.apple.com/documentation/appintents/audiorecordingintent)

## 8. Validation and success metrics

Recruit 12–15 adults who abandoned at least two journaling/planning tools. Include people who like voice and people who cannot conveniently speak. Interview about the last actual lapse, the situation that triggered it, and the tool they returned to. Avoid collecting diagnoses or raw journals by default.

Compare a tiny typed check-in with voice-to-structure. Observe first use, then a 14-day trial and a four-week follow-up. Recruit beyond the founder's friends. Compensate participation rather than positive feedback.

Proposed decision thresholds, not market benchmarks:

| Metric | Definition | Initial target |
|---|---|---|
| Activation | First local save + accepted/edited result or deliberately completed non-AI check-in | At least 70% of beta starters |
| Time to value | First open to first useful result, including permission/setup time | Median under 60 seconds; track repeat-session median under 30 seconds |
| Week-two use | At least three saved check-ins on different days during days 8–14 | At least 40% of activated testers |
| Useful insight | Explicit useful response among rated insights; report rating coverage too | At least 60%, with a concrete example in interviews |
| Meaningful AI correction | Result corrected for a materially wrong fact/intent | Below 10%; zero tolerance for unsupported clinical claims in release evaluation |
| Reliability | Saved-entry loss / duplicate effects on retries | Zero known reproducible loss or duplication |
| Return after lapse | Check-in within seven days after an observed 3+ day gap | Track with eligible denominator; set target after a baseline |

North-star candidate: weekly users reporting at least one useful return to a chosen next step. Use occasional feedback rather than another mandatory question. Do not optimize session length or check-in volume as ends in themselves.

With 15 testers, report counts as well as percentages. Small-cohort results guide product decisions; they do not establish market-wide retention or treatment benefit.

## 9. Monetization and acquisition

Free foundation: local typed/manual check-ins, current anchor, history, basic reminders, export, and deletion. Provide a limited cloud-AI trial with its limit visible before use. When a budget is exhausted, preserve ordinary capture and access to existing data.

Paid hypothesis: richer weekly synthesis, longer useful context, optional sync/backup and cross-device convenience. Test approximately $4.99/month and $34.99/year as an initial offer, not a final decision. Raise or reduce only after measuring value, conversion, and cost. Avoid weekly subscriptions and unlimited lifetime AI promises.

Contribution per payer = receipts after platform fees/refunds/taxes minus AI, transcription, storage, and variable support. Model 60 short check-ins plus four digests per month, then a heavy-use case at several times that volume. Select providers and quotas using measured cost per useful result. Initial margin goal: over 70% after variable costs; this is a planning target.

First acquisition: 20–30 TestFlight participants through existing audience and permitted community recruitment. Test three messages: “clear your head,” “restart an interrupted day,” and “a journal you can return to.” Demonstrate a real 30-second session. Avoid therapeutic promises. Expand to 50–100 beta users only when data safety and the core loop hold.

## 10. Delivery plan

Planning range: 12–16 weeks for one experienced full-time developer with part-time design/testing support. This is conditional on access to an Apple developer account, working backend, timely user recruitment, and limited scope. Store review time is external. Part-time execution can take materially longer.

| Phase | Rough duration | Deliverables | Exit gate |
|---|---|---|---|
| 0. Choose the job | Weeks 1–2 | Interviews; evaluate founder experiment if data exists; short-flow prototype; language/storefront choice; cost envelope | Users can identify a recurring situation and explain why this helps |
| 1. Prove iOS path | Weeks 3–4 | Installed vertical slice; native capture; local restore; API boundary; initial migration design | Core flow survives offline use, termination, interrupted audio, and retry |
| 2. Build the loop | Weeks 5–7 | Today/capture/edit/history/reset/evening; optional reminders; guest controls | 12–15 testers complete ordinary sessions without assistance |
| 3. Make insight trustworthy | Weeks 8–9 | Grounded digest; extraction evals; secure sync; export/delete; telemetry redaction | Source-linked insights and no known data-loss path |
| 4. Run closed beta | Weeks 10–13 | 50–100 testers if earlier gates pass; four-week cohort; accessibility/device pass; pricing test | Retention/value signals, operational reliability, and purchase lifecycle verified |
| 5. Release candidate | Weeks 14–16 | Store metadata, screenshots, privacy disclosures, support, review access, staged rollout plan | Release checklist passes; remaining defects have explicit disposition |

A narrower local/manual beta can ship earlier. A full SwiftUI rewrite, Apple Watch app, Health integration, E2EE recovery system, and rich content library are outside this estimate.

### First implementation backlog

1. Define the single-session contract and remove mandatory ritual depth from the proposed flow.
2. Establish native-build/backend boundary and environment separation.
3. Add durable CheckIn/Anchor storage and migration fixtures.
4. Implement one reliable voice/text capture screen.
5. Add editable interpretation with source provenance.
6. Integrate Focus/Pulse into the next-step journey.
7. Add gentle re-entry and user-controlled reminders.
8. Deliver export, deletion, lock, and privacy controls.
9. Add grounded weekly retrospectives.
10. Run cohort validation before expanding scope.

### Release verification

Run repository typecheck, lint, tests, web build, and native build during implementation. Exercise on real iPhones: cold start, airplane mode, force quit during save, audio interruption, microphone denial, notification denial/time-zone changes, account switch, concurrent edits, upgrade migration, full storage, and expired credentials. Test purchase/restore/expiration and deletion with pending sync. Simulator screenshots and green web tests do not substitute for device proof.

Apple review preparation includes meaningful app functionality, appropriate purchase handling, account deletion when accounts can be created, and explicit permission for sharing personal data with third-party AI. Audit privacy manifests, SDK behavior, and store disclosures together; recheck current guidelines at submission. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app)

## 11. Decisions that could change this plan

- If users prefer quick taps to voice, preserve the loop and make voice secondary.
- If summaries are liked but do not change return behavior, simplify or defer paid AI.
- If reminders are routinely ignored, study timing/context before adding more notifications.
- If weekly reports do not add value, focus on immediate recovery rather than invented patterns.
- If users primarily want full scheduling, assess that as a separate product decision against Tiimo rather than silently expanding Anchor.
- If installed-device tests reveal repeated architectural blockers, compare a bounded native rewrite against the cost of bridging them.

The desired outcome after several months is a dependable, small iOS app that users can re-enter on a difficult day and leave with less mental clutter and a chosen next step. Feature breadth is subordinate to that outcome.
