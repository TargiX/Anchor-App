import Foundation
import Darwin

/// File operations run on the journal plugin's serial queue.
enum JournalArchiveRecovery {
    static func directory(for archive: URL) throws -> URL {
        let url = archive.deletingLastPathComponent().appendingPathComponent("Journal Recovery", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        try JournalAtomicWrite.synchronizeDirectory(archive.deletingLastPathComponent())
        return url
    }

    @discardableResult
    static func restore(_ replacement: Data, at archive: URL, legacy: Data) throws -> URL {
        let original = FileManager.default.fileExists(atPath: archive.path)
            ? try Data(contentsOf: archive) : legacy
        let backup = try directory(for: archive).appendingPathComponent("anchor-before-restore-\(UUID().uuidString).json")
        try JournalAtomicWrite.write(original, to: backup)
        // Failure to preserve the original must prevent any replacement.
        try JournalAtomicWrite.write(replacement, to: archive)
        return backup
    }
}


/// Shared by ordinary saves and recovery. A post-rename failure is reported even
/// though replacement may already be visible. No absolute power-loss guarantee.
enum JournalAtomicWrite {
    enum Stage: CaseIterable { case fileSync, rename, directorySync }

    private static func check(_ result: Int32) throws {
        if result == -1 { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    }

    static func synchronizeDirectory(_ directory: URL) throws {
        let fd = open(directory.path, O_RDONLY | O_DIRECTORY | O_CLOEXEC)
        try check(fd)
        defer { close(fd) }
        try check(fsync(fd))
    }

    static func write(_ data: Data, to destination: URL,
                      before: (Stage) throws -> Void = { _ in }) throws {
        let parent = destination.deletingLastPathComponent()
        let temporary = parent.appendingPathComponent(".anchor-write-\(UUID().uuidString).tmp")
        defer { try? FileManager.default.removeItem(at: temporary) }
        // Exclusive creation and protection apply before opening the descriptor.
        try data.write(to: temporary, options: [.withoutOverwriting, .completeFileProtection])
        let fd = open(temporary.path, O_RDWR | O_NOFOLLOW | O_CLOEXEC)
        try check(fd)
        defer { close(fd) }
        try before(.fileSync)
        try check(fsync(fd))
        try check(fcntl(fd, F_FULLFSYNC))
        try before(.rename)
        try check(Darwin.rename(temporary.path, destination.path))
        try before(.directorySync)
        try synchronizeDirectory(parent)
        // Flush after directory metadata has been submitted as well.
        try check(fcntl(fd, F_FULLFSYNC))
    }
}
