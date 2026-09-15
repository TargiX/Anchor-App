import Capacitor
import Foundation

@objc(AnchorJournalPlugin)
public final class AnchorJournalPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AnchorJournalPlugin"
    public let jsName = "AnchorJournal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "app.anchor.journal")

    private func archiveURL() throws -> URL {
        let support = try FileManager.default.url(for: .applicationSupportDirectory,
            in: .userDomainMask, appropriateFor: nil, create: true)
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
                // Atomic replacement preserves the previous archive on write failure.
                // Complete protection keeps the file inaccessible while the device is locked.
                try data.write(to: self.archiveURL(), options: [.atomic, .completeFileProtection])
                call.resolve()
            } catch {
                call.reject("Journal could not be saved")
            }
        }
    }
}
