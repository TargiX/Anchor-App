# Anchor: everyday journaling, built for release

Updated: 2026-09-15. This is the current product direction and supersedes the
positioning, recruitment, experiments, and release gates in ios-product-vision.md.

## Decision

Build a polished iPhone journal for capturing life, understanding a day, and
choosing what matters next. Good memories, ordinary days, relationships, ideas,
and difficult moments all belong here. Overwhelm is one optional use case.

Use established competitor patterns to reduce product invention and production
cost. Do not require a recruited test group, interviews, paid acquisition tests,
or pricing experiments before shipping. Engineering QA remains a release gate.
Competitor features establish category expectations; they do not establish
Anchor's future conversion, retention, or profitability.

## Reference products and original execution

Official feature pages checked on 2026-09-15. These are capability references,
not a ranking by revenue or independently measured user satisfaction.

| Reference | Pattern to adopt | Anchor implementation direction |
|---|---|---|
| [Day One](https://dayoneapp.com/features/) | Rich capture, searchable memories, export, protection of personal records | An approachable day-based journal with text, voice drafts, photos, search, and clear ownership of data |
| [Stoic](https://www.getstoic.com/features) | Morning/evening reflections and optional prompts | Short optional daily entry points, with original prompts about everyday life |
| [Daylio](https://daylio.net/) | Fast mood/activity recording and retrospective views | Optional quick mood input alongside writing; useful summaries without compulsory daily tracking |

Build original layouts, illustrations, copy, prompts, transitions, and content.
Do not reproduce another app's screen sequence, branding, assets, or prompt library.

## Product identity

Working promise: **Keep your days. Make room for what matters.**

The distinctive experience is the connection between a moment, its place in the
week, and a small personal decision. It must work without generated advice.

TargiX is the studio behind Anchor and defines its production/design approach;
Anchor remains the application and release name.

TargiX production direction: expressive typography, warm restrained color,
original illustrations, tactile controls, and deliberate transitions. Journal
content leads each screen. Validate contrast, Dynamic Type, VoiceOver, keyboard
behavior, and reduced motion as part of that design.

## The complete first-release loop

1. **Today:** capture immediately; optionally begin with an intention, pause,
   or reflect in the evening. No prerequisite ritual or compulsory mood form.
2. **Journal:** browse days, edit and delete entries, attach a photo, find text,
   favorite a memory, and export or recover records.
3. **Review:** revisit a week, open the original entries, write what mattered,
   and choose an optional next step. Show that step on Today; allow the user to
   finish it, change it, or let it go.

The review describes recorded data. Missing data is not zero. Excerpts retain
the user's words; the app does not infer psychological traits or causality.
Personal directions begin as this small follow-through feature, not a fourth
navigation area or a separate project-management system.

## Current implementation, not release claims

- Today / Journal / Review navigation and optional existing daily rituals.
- Short notes and next steps, local search, seven-day review, source-entry links,
  and written weekly reflections.
- Native file storage with acknowledged saves and retry behavior.
- On-device voice drafts that require review before insertion into a note.
- Markdown export and existing optional account synchronization.

Physical-device voice behavior and live multi-device sync are not yet verified.
The native storage boundary now blocks malformed or unsupported journal slots
before any migration, cleanup, or writable app startup. Original bytes remain
untouched. A user-facing repair/import flow is still needed before release.
The implementation is an unfinished app in a draft PR, not an App Store release.

## Ordered production plan

### 1. Protect the journal

- Preserve malformed or unsupported saved data before any mutation; present a
  recovery state instead of silently substituting an empty writable journal.
- Cover corruption, interrupted writes, migration, account switching, and
  supported-version compatibility with focused regression checks.
- Provide a usable backup/export and restore path with understandable errors.
- Verify sync conflicts across devices before advertising account sync.

Done when saved records survive supported failure/recovery paths and the user
can recover their data without developer tooling.

### 2. Finish the everyday journal

- Complete edit/delete with confirmation or undo, drafts, favorites, and photo
  capture through the system picker, including local persistence and export.
- Add optional fast mood input to the everyday capture flow.
- Connect the weekly next step to Today with explicit user-controlled outcomes.
- Make empty, saving, saved, offline, and failed states coherent across screens.

Done when a person can capture, correct, find, revisit, and retain a real day
without encountering a placeholder or needing an account.

### 3. Deliver the TargiX experience

- Create a consistent visual system and original small illustration set.
- Finish onboarding around the first saved entry, not a questionnaire.
- Offer optional reminders after that entry and an app-lock privacy control.
- Polish safe areas, keyboard interactions, sheets, touch targets, typography,
  VoiceOver, large text, dark appearance, and reduced motion.
- Verify voice permissions, interruption, cancellation, and unsupported locale
  behavior on a physical iPhone; keep text fully usable.

Done when the complete first session and return visit work on a physical iPhone.
Internal device QA does not require a recruited commercial test group.

### 4. Package and sell a finished product

- Launch with one comprehensible paid tier and one App Store purchase channel.
  Set the exact price once the included features and recurring costs are fixed.
- Preserve access to existing writing and export after entitlement expiry.
- Make the paid value concrete: richer journal organization, customization,
  and review tools that have actually shipped. Never sell roadmap promises.
- Verify purchase, restore, expiry, cancellation links, and offline entitlement
  behavior in the relevant Apple test environment.
- Prepare truthful screenshots showing Today, a personal entry, and the weekly
  review; finish support, privacy details, metadata, and release signing.
- Prepare an organic launch page and short product demonstrations. Distribution
  is part of delivery; an App Store listing alone is not a sales strategy.

Done when the signed build, store materials, support path, and payment lifecycle
are ready. Submission, approval, availability, and purchases are separate facts.

## Cost discipline and scope

Reuse the existing stack. Keep the core offline-capable and voice processing on
device where supported. Do not add an unlimited cloud-AI promise or a large
content-production obligation to v1. Account infrastructure, media storage,
maintenance, and store costs still need an explicit operating budget.

Defer a general chatbot, calendar replacement, task hierarchy, social network,
pet economy, extensive meditation catalog, and additional platforms. Breadth
comes from the life situations supported by the same journal, not unrelated
modules. Future expansion follows the shipped product and available resources.

No guaranteed commercial outcome is claimed. The operating choice is to spend
on a coherent, differentiated implementation in an established category and
remove avoidable release defects, rather than fund pre-launch market experiments.
