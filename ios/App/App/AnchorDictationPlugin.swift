import AVFoundation
import Capacitor
import Speech
import UIKit

@objc(AnchorDictationPlugin)
public final class AnchorDictationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AnchorDictationPlugin"
    public let jsName = "AnchorDictation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private var sessionID: String?
    private var pending: CAPPluginCall?
    private var engine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?
    private var transcript = ""
    private var tapped = false
    private var finishing = false
    private var timer: Timer?
    private var observers: [NSObjectProtocol] = []
    private var previousAudio: (AVAudioSession.Category, AVAudioSession.Mode, AVAudioSession.CategoryOptions)?

    @objc func availability(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let locale = call.getString("locale") ?? "en-US"
            let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale))
            call.resolve(["supported": recognizer?.supportsOnDeviceRecognition == true])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.sessionID == nil else { call.reject("Dictation is already running", "busy"); return }
            guard let id = call.getString("id"), let locale = call.getString("locale"),
                  let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)),
                  recognizer.supportsOnDeviceRecognition else {
                call.reject("On-device dictation is unavailable for this language", "unsupported")
                return
            }
            self.sessionID = id
            self.pending = call
            self.recognizer = recognizer
            self.transcript = ""
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    guard self.sessionID == id else { return }
                    guard status == .authorized else { self.fail("Allow speech recognition in Settings to dictate", code: "speech_permission"); return }
                    AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                        DispatchQueue.main.async {
                            guard self.sessionID == id else { return }
                            guard allowed else { self.fail("Allow microphone access in Settings to dictate", code: "microphone_permission"); return }
                            guard UIApplication.shared.applicationState == .active else { self.finish(reason: "interrupted"); return }
                            self.begin(id: id)
                        }
                    }
                }
            }
        }
    }

    private func begin(id: String) {
        do {
            guard let recognizer = recognizer, recognizer.isAvailable,
                  recognizer.supportsOnDeviceRecognition else {
                fail("On-device dictation is currently unavailable", code: "unavailable")
                return
            }
            let audio = AVAudioSession.sharedInstance()
            previousAudio = (audio.category, audio.mode, audio.categoryOptions)
            try audio.setCategory(.record, mode: .measurement)
            try audio.setActive(true)
            let engine = AVAudioEngine()
            self.engine = engine
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = true
            self.request = request
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0 && format.channelCount > 0 else {
                fail("No microphone input is available", code: "audio_unavailable")
                return
            }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            tapped = true
            task = recognizer.recognitionTask(with: request) { result, error in
                DispatchQueue.main.async {
                    guard self.sessionID == id else { return }
                    if let result = result { self.transcript = result.bestTranscription.formattedString }
                    if result?.isFinal == true { self.finish(reason: "completed") }
                    else if error != nil {
                        if self.transcript.isEmpty { self.fail("Could not recognize speech. Try again or type your note", code: "recognition_failed") }
                        else { self.finish(reason: "interrupted") }
                    }
                }
            }
            engine.prepare()
            try engine.start()
            notifyListeners("state", data: ["id": id, "state": "recording"])
            timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: false) { [weak self] _ in self?.endAudio(id: id) }
            for name in [UIApplication.didEnterBackgroundNotification, AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification] {
                observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
                    guard let self = self, self.sessionID == id else { return }
                    if name == AVAudioSession.routeChangeNotification {
                        guard notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue else { return }
                    }
                    self.finish(reason: "interrupted")
                })
            }
        } catch {
            fail("Microphone could not be started. Try again or type your note", code: "audio_unavailable")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let id = call.getString("id"), self.sessionID == id { self.endAudio(id: id) }
            call.resolve()
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if call.getString("id") == self.sessionID { self.finish(reason: "cancelled", discard: true) }
            call.resolve()
        }
    }

    private func endAudio(id: String) {
        guard sessionID == id, !finishing else { return }
        finishing = true
        if engine == nil { finish(reason: "cancelled", discard: true); return }
        timer?.invalidate()
        engine?.stop()
        if tapped { engine?.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio()
        notifyListeners("state", data: ["id": id, "state": "finishing"])
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: false) { [weak self] _ in
            guard self?.sessionID == id else { return }
            self?.finish(reason: "stopped")
        }
    }

    private func finish(reason: String, discard: Bool = false) {
        let call = pending
        let text = discard ? "" : transcript
        cleanup()
        call?.resolve(["text": text, "reason": reason])
    }

    private func fail(_ message: String, code: String) {
        let call = pending
        cleanup()
        call?.reject(message, code)
    }

    private func cleanup() {
        sessionID = nil
        pending = nil
        timer?.invalidate()
        timer = nil
        engine?.stop()
        if tapped { engine?.inputNode.removeTap(onBus: 0); tapped = false }
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        engine = nil
        recognizer = nil
        transcript = ""
        finishing = false
        observers.forEach(NotificationCenter.default.removeObserver)
        observers.removeAll()
        if let previous = previousAudio {
            let audio = AVAudioSession.sharedInstance()
            try? audio.setActive(false, options: .notifyOthersOnDeactivation)
            try? audio.setCategory(previous.0, mode: previous.1, options: previous.2)
            previousAudio = nil
        }
    }
}
