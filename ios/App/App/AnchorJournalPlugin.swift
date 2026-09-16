import Capacitor
import Foundation
import UIKit
import LocalAuthentication

@objc(AnchorJournalPlugin)
public final class AnchorJournalPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "AnchorJournalPlugin"
    public let jsName = "AnchorJournal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportArchive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreArchive", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "app.anchor.journal")

    private func archiveURL() throws -> URL {
        let support = try FileManager.default.url(for: .applicationSupportDirectory,
            in: .userDomainMask, appropriateFor: nil, create: true)
        // Also persist the parent entry if Application Support was just created.
        try JournalAtomicWrite.synchronizeDirectory(support.deletingLastPathComponent())
        return support.appendingPathComponent("anchor-journal.json")
    }

    @objc func load(_ call: CAPPluginCall) {
        queue.async {
            do {
                let url = try self.archiveURL()
                guard FileManager.default.fileExists(atPath: url.path) else {
                    call.resolve(["value": NSNull()])
                    return
                }
                let data = try Data(contentsOf: url)
                guard let value = String(data: data, encoding: .utf8) else {
                    call.reject("Journal could not be decoded")
                    return
                }
                call.resolve(["value": value])
            } catch {
                call.reject("Journal could not be opened")
            }
        }
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), let data = value.data(using: .utf8) else {
            call.reject("Missing journal archive")
            return
        }
        queue.async {
            do {
                // Acknowledge only after file and directory synchronization.
                try JournalAtomicWrite.write(data, to: self.archiveURL())
                call.resolve()
            } catch {
                call.reject("Journal could not be saved")
            }
        }
    }

    // Recovery is available before account login; authenticate the device owner
    // because a device archive can contain more than one account's journal.
    private var recoveryBusy = false
    private var exportCall: CAPPluginCall?
    private var exportDirectory: URL?

    private func authenticate(_ call: CAPPluginCall, action: @escaping () -> Void) {
        DispatchQueue.main.async {
            guard !self.recoveryBusy else { call.reject("Another backup operation is in progress."); return }
            self.recoveryBusy = true
            let context = LAContext()
            var error: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
                self.recoveryBusy = false
                call.reject("Set a device passcode in iOS Settings to protect journal backups.")
                return
            }
            context.evaluatePolicy(.deviceOwnerAuthentication,
                localizedReason: "Protect all journals in your device backup") { success, _ in
                DispatchQueue.main.async {
                    guard success else {
                        self.recoveryBusy = false
                        call.reject("Authentication cancelled. Your journal has not been changed.")
                        return
                    }
                    action()
                }
            }
        }
    }

    private func failRecovery(_ call: CAPPluginCall, _ message: String) {
        DispatchQueue.main.async {
            self.recoveryBusy = false
            call.reject(message)
        }
    }

    private func backupDirectory() throws -> URL {
        try JournalArchiveRecovery.directory(for: archiveURL())
    }

    @objc func restoreArchive(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), let data = value.data(using: .utf8),
              data.count <= 20 * 1024 * 1024,
              let archive = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              !archive.isEmpty else { call.reject("Invalid journal backup."); return }
        // Full version/schema validation is performed by the shared JS validator
        // before preview and again immediately before this bridge call.
        authenticate(call) {
            self.queue.async {
                do {
                    let url = try self.archiveURL()
                    guard let legacy = call.getString("legacyValue")?.data(using: .utf8) else {
                        throw NSError(domain: "AnchorJournal", code: 1)
                    }
                    try JournalArchiveRecovery.restore(data, at: url, legacy: legacy)
                    DispatchQueue.main.async { self.recoveryBusy = false; call.resolve() }
                } catch {
                    self.failRecovery(call, "Restore could not be completed. The original journal has been kept.")
                }
            }
        }
    }

    @objc func exportArchive(_ call: CAPPluginCall) {
        authenticate(call) {
            self.queue.async {
                do {
                    let data: Data
                    if call.getBool("previous") == true {
                        let files = try FileManager.default.contentsOfDirectory(at: self.backupDirectory(),
                            includingPropertiesForKeys: [.contentModificationDateKey])
                        let latest = try files.filter { $0.pathExtension == "json" }.sorted {
                            let a = try $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? .distantPast
                            let b = try $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? .distantPast
                            return a > b
                        }.first
                        guard let latest else {
                            self.failRecovery(call, "There is no copy from an earlier restore yet.")
                            return
                        }
                        data = try Data(contentsOf: latest)
                    } else {
                        let url = try self.archiveURL()
                        if FileManager.default.fileExists(atPath: url.path) {
                            data = try Data(contentsOf: url)
                        } else if let legacy = call.getString("legacyValue")?.data(using: .utf8) {
                            data = legacy
                        } else { throw NSError(domain: "AnchorJournal", code: 2) }
                    }
                    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                    let export = directory.appendingPathComponent("anchor-journal-backup.json")
                    try data.write(to: export, options: [.atomic, .completeFileProtection])
                    DispatchQueue.main.async {
                        guard let controller = self.bridge?.viewController,
                              controller.presentedViewController == nil else {
                            try? FileManager.default.removeItem(at: directory)
                            self.failRecovery(call, "Close the open sheet and try again.")
                            return
                        }
                        self.exportCall = call
                        self.exportDirectory = directory
                        let picker = UIDocumentPickerViewController(forExporting: [export], asCopy: true)
                        picker.delegate = self
                        picker.isModalInPresentation = true
                        controller.present(picker, animated: true)
                    }
                } catch {
                    self.failRecovery(call, "The backup could not be exported. Unlock your device and try again.")
                }
            }
        }
    }

    private func finishExport(cancelled: Bool) {
        if let directory = exportDirectory { try? FileManager.default.removeItem(at: directory) }
        exportDirectory = nil
        recoveryBusy = false
        exportCall?.resolve(["cancelled": cancelled])
        exportCall = nil
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        finishExport(cancelled: false)
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishExport(cancelled: true)
    }

}
