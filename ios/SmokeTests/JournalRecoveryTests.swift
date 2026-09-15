import XCTest

final class JournalRecoveryTests: XCTestCase {
    private func withArchive(_ run: (URL) throws -> Void) throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try run(root.appendingPathComponent("anchor-journal.json"))
    }

    func testPreservesUndecodableOriginalBytesBeforeReplacing() throws {
        try withArchive { archive in
            let original = Data([0xff, 0xfe, 0x00, 0x81])
            let replacement = Data("replacement".utf8)
            try original.write(to: archive)
            let backup = try JournalArchiveRecovery.restore(replacement, at: archive, legacy: Data())
            XCTAssertEqual(try Data(contentsOf: backup), original)
            XCTAssertEqual(try Data(contentsOf: archive), replacement)
        }
    }

    func testBackupFailureLeavesOriginalUnchanged() throws {
        try withArchive { archive in
            let original = Data("original".utf8)
            try original.write(to: archive)
            // A file where the backup directory must be prevents preservation.
            try Data().write(to: archive.deletingLastPathComponent().appendingPathComponent("Journal Recovery"))
            XCTAssertThrowsError(try JournalArchiveRecovery.restore(Data("new".utf8), at: archive, legacy: Data()))
            XCTAssertEqual(try Data(contentsOf: archive), original)
        }
    }

    func testMigrationPreservesLegacyBytesAndRepeatedRestoresKeepEarlierCopies() throws {
        try withArchive { archive in
            let legacy = Data("damaged WebView journal".utf8)
            let first = try JournalArchiveRecovery.restore(Data("first".utf8), at: archive, legacy: legacy)
            let second = try JournalArchiveRecovery.restore(Data("second".utf8), at: archive, legacy: legacy)
            XCTAssertNotEqual(first, second)
            XCTAssertEqual(try Data(contentsOf: first), legacy)
            XCTAssertEqual(try Data(contentsOf: second), Data("first".utf8))
            XCTAssertEqual(try Data(contentsOf: archive), Data("second".utf8))
        }
    }
}
