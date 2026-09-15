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

Supported v1/v2 envelopes and valid legacy flat state remain readable. Validation
does not reserialize the imported strings. Invalid subsequent adapter writes
return false without changing the memory mirror or scheduling a disk write.

The opening screen distinguishes newer-version data, damaged data, and ordinary
read failures. Retry rereads the original archive. It does not repair records.

## Verification

Regression tests cover malformed inner JSON, partial entry corruption, future
versions, all slot types, migration preservation, rejected writes, retry after
repair, valid legacy/current archives, serialized writes, and disk-write failure.
Tests use synthetic records; no user journal is changed.

## Remaining work

This guard is specific to the native iOS adapter. The web store and cloud merge
still use permissive migration and require separate hardening. An in-app backup
export/import and recovery workflow remains unfinished. The original damaged
archive is preserved in place; this change does not create an additional backup
or claim that corrupted content can always be recovered.
