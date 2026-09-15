import Foundation

/// File operations run on the journal plugin's serial queue.
enum JournalArchiveRecovery {
    static func directory(for archive: URL) throws -> URL {
        let url = archive.deletingLastPathComponent().appendingPathComponent("Journal Recovery", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    @discardableResult
    static func restore(_ replacement: Data, at archive: URL, legacy: Data) throws -> URL {
        let original = FileManager.default.fileExists(atPath: archive.path)
            ? try Data(contentsOf: archive) : legacy
        let backup = try directory(for: archive).appendingPathComponent("anchor-before-restore-\(UUID().uuidString).json")
        try original.write(to: backup, options: [.atomic, .completeFileProtection])
        // Failure to preserve the original must prevent any replacement.
        try replacement.write(to: archive, options: [.atomic, .completeFileProtection])
        return backup
    }
}
