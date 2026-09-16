# Journal editing and local drafts

Today and Journal use the same note controls. Short check-ins support text and
next-step editing; evening journal text can also be edited from Journal. Edits
preserve the note identifier, creation time, and other fields for the day.
Changing a historical next step does not rewrite the day's current intention.

Delete asks for confirmation and offers Undo for the most recent deletion until
dismissed or another deletion replaces it. Undo remains available while navigating
within the app, but is not a durable trash bin and does not survive app termination.
It preserves intervening changes to neighboring fields, rejects conflicting
replacements, and cannot restore text into another account's storage slot.
Existing day-level cloud reconciliation still applies; cross-device simultaneous
editing has not been validated on real accounts.

The Today composer and each weekly-review period keep separate device drafts.
Drafts preserve new-note text and next steps across navigation and relaunch. They
are stored beside `data` in the version-3 local envelope as `localDrafts`, not in
AppState, so normal account cloud persistence does not send them. Local backup
files include drafts; sign-out/deletion of a storage slot removes its drafts too.
Legacy v1/v2 envelopes remain readable. Earlier native builds reject v3 data
instead of overwriting it.

Save first acknowledges the journal write, then clears the draft. A retained
draft uses the same note identifier so interrupted cleanup cannot create a second
copy. After a failed native note save, input is held for retry to prevent edits
from being mistaken for an already committed note. Device save failures stay
visible. Unsaved changes inside the existing-note editor are currently kept only
while that editor is mounted; durable drafts cover the new-note composers.

Validation covers field preservation, stale edits, delete/undo, account boundaries,
rejected writes, draft persistence, cloud exclusion, and corrupt-envelope refusal.
The simulator UI test verifies draft navigation/relaunch, saving, editing,
deleting, undo, another relaunch, and draft cleanup. Physical-iPhone and live
multi-device editing remain release checks.
