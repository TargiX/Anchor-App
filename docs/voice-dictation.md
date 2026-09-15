# Voice drafts on iOS

The journal composer offers English and Russian dictation on supported iOS
devices. Voice is another way to compose an ordinary text note; it does not
create an audio attachment or save a journal entry automatically.

## User flow

1. Select a language and tap **Dictate**. Capability checks do not request access.
2. Grant speech and microphone permissions when iOS asks at first use.
3. Speak, then tap **Stop**, or wait for the one-minute limit.
4. Review and edit the voice draft. **Add to note** appends it to existing text;
   **Discard** leaves the original note unchanged.
5. Tap the normal save button to persist the resulting note.

If the combined text exceeds the note limit, the draft stays available for
editing. Words are never silently truncated. Navigating away cancels the session;
the voice draft is temporary until added and saved.

## Privacy and lifecycle

- `AnchorDictationPlugin` requires `supportsOnDeviceRecognition` and sets
  `requiresOnDeviceRecognition = true`. It does not fall back to server-based
  speech recognition. See Apple's [capability documentation](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition)
  and [request setting](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition).
- Audio buffers are passed to the recognizer in memory and are not written to a
  file. The resulting text follows the journal's existing local/account storage
  behavior only after the user adds and saves it.
- Recording ends on backgrounding, audio interruption, microphone disconnection,
  cancellation, recognition completion/error, or the duration limit. A captured
  partial transcript is offered for review after interruption.
- Stop ends audio capture immediately, then allows up to two seconds for the
  recognizer's final result. Cleanup restores the previous audio-session category.
- Session IDs guard against delayed permission callbacks, recognition callbacks,
  and cancellation from a screen that has already unmounted.
- Permission denial or unsupported language/device leaves typing available.
  Speech model availability varies by device and language.

## Verification boundaries

Unit tests cover cancellation during listener setup, late callbacks, duplicate
starts, stop failure, event ownership, append behavior and character limits.
The simulator UI test verifies that opening the composer does not start capture.
Existing save/relaunch and review-navigation regressions also run.

Real microphone recognition, permission dialogs, denied-permission recovery,
Bluetooth changes, lock/background behavior and language accuracy need a physical
iPhone test before release. Simulator/build success is not proof of those paths.
