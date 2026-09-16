import XCTest

final class JournalRecoveryTests: XCTestCase {
    private func withArchive(_ run: (URL) throws -> Void) throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try run(root.appendingPathComponent("anchor-journal.json"))
    }

    func testAtomicWriteSynchronizesInOrder() throws {
        try withArchive { archive in
            var stages: [JournalAtomicWrite.Stage] = []
            try JournalAtomicWrite.write(Data("saved".utf8), to: archive) { stages.append($0) }
            XCTAssertEqual(stages, [.fileSync, .rename, .directorySync])
            XCTAssertEqual(try Data(contentsOf: archive), Data("saved".utf8))
        }
    }

    func testCompleteFileProtectionOnDevice() throws {
#if targetEnvironment(simulator)
        throw XCTSkip("Verify file protection on a physical iPhone; the simulator does not expose this attribute.")
#else
        try withArchive { archive in
            try JournalAtomicWrite.write(Data("protected".utf8), to: archive)
            let attributes = try FileManager.default.attributesOfItem(atPath: archive.path)
            XCTAssertEqual(attributes[.protectionKey] as? FileProtectionType, .complete)
        }
#endif
    }

    func testAtomicWriteFailureBeforeRenamePreservesOriginalAndCleansTemporaryFile() throws {
        for stage in [JournalAtomicWrite.Stage.fileSync, .rename] {
            try withArchive { archive in
                let original = Data("original".utf8)
                try original.write(to: archive)
                XCTAssertThrowsError(try JournalAtomicWrite.write(Data("new".utf8), to: archive) {
                    if $0 == stage { throw NSError(domain: "injected", code: 1) }
                })
                XCTAssertEqual(try Data(contentsOf: archive), original)
                let files = try FileManager.default.contentsOfDirectory(atPath: archive.deletingLastPathComponent().path)
                XCTAssertEqual(files, ["anchor-journal.json"])
            }
        }
    }

    func testDirectorySyncFailureIsReportedEvenIfReplacementIsVisible() throws {
        try withArchive { archive in
            try Data("original".utf8).write(to: archive)
            XCTAssertThrowsError(try JournalAtomicWrite.write(Data("new".utf8), to: archive) {
                if $0 == .directorySync { throw NSError(domain: "injected", code: 1) }
            })
            XCTAssertEqual(try Data(contentsOf: archive), Data("new".utf8))
            // Retrying the same snapshot is safe after an uncertain acknowledgement.
            try JournalAtomicWrite.write(Data("new".utf8), to: archive)
            XCTAssertEqual(try Data(contentsOf: archive), Data("new".utf8))
        }
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
