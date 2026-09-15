# Native journal storage safety

## Protected failure cases

The iOS storage adapter validates both the archive and every journal slot before
installing the writable store. Invalid JSON, invalid entry/state data, malformed
envelopes, and unsupported versions block startup. Validation runs before the
first WebView-to-native migration write and before deleting WebView copies.

This prevents the store's permissive recovery logic from turning unreadable
native records into an empty journal and overwriting their original bytes on
the next save. One damaged account slot blocks the entire archive, including
other accounts, because they share the same snapshot file.

Supported v1/v2/v3 envelopes and valid legacy flat state remain readable. Validation
does not reserialize the imported strings. Invalid subsequent adapter writes
return false without changing the memory mirror or scheduling a disk write.

The opening screen distinguishes newer-version data, damaged data, and ordinary
read failures. Retry rereads the original archive. It does not repair records.

## Backup and restore workflow

On iOS, Journal and Settings offer **Save a copy to Files** and **Restore a
backup**. The blocked opening screen offers the same file export and backup
selection. A backup contains all local journal slots, including account slots;
the UI explicitly identifies that scope and that exported JSON is unencrypted.
Device-owner authentication (Face ID or device passcode) is required before
export or replacement because recovery can run before account login. Devices
without a configured passcode cannot perform those native operations.

Normal restoration waits for pending device writes and then unmounts the
journal/auth/sync consumers before entering recovery. The selected file is limited to
20 MB and validated with the same parser as startup. The UI previews journal/day
counts and requires explicit confirmation; empty, corrupt, and future-version
archives cannot replace the journal. Restore replaces the device archive; it
does not merge it. Markdown exports are not importable backups.

The native serial queue preserves the exact original bytes in a unique file in
Application Support/Journal Recovery before atomically replacing the archive.
If native migration had not completed, the preserved original is the journal
slots from WebView storage. Copy failure prevents replacement. Repeated restores
keep earlier copies. **Export copy from before last restore** exposes the most
recent retained copy through the Files picker, after device authentication.
These retained copies survive account logout; removing the app removes them.
Temporary export files are removed when the Files picker finishes or cancels.

After a successful restore, storage is reopened from disk and its old in-memory
state is reset. Account slots keep their identities: existing sign-out cleanup
and cloud synchronization rules still apply when the app remounts. This is a
local archive recovery feature, not a rollback of a cloud account. Keep the
external backup when recovering account journals.

## Verification

Regression tests cover malformed inner JSON, partial entry corruption, future
versions, all slot types, migration preservation, rejected writes, retry after
repair, valid legacy/current archives, serialized writes, and disk-write failure.
Tests use synthetic records; no user journal is changed. Native filesystem tests
exercise binary-byte preservation, a blocked backup directory, migration, and
repeated restores. The simulator UI check exercises recovery entry/cancellation.
Physical-device authentication and Files import/export round trips remain release
checks; passing filesystem tests does not establish those UI outcomes.

## Remaining work

This guard is specific to the native iOS adapter. The web store and cloud merge
still use permissive migration and require separate hardening. The backup
workflow restores a previously valid copy; it does not reconstruct
unreadable entries automatically. Cloud-account recovery and physical-device
Files/authentication validation remain unfinished.
