import XCTest

/// Runs against the already installed native app, with its real WKWebView storage.
final class CheckInTests: XCTestCase {
    func testDraftThenEditDeleteAndUndo() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        let note = app.textViews.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 20), app.debugDescription)
        let marker = "Journal editing \(UUID().uuidString.prefix(8))"
        note.tap()
        note.typeText(marker)
        let done = app.toolbars.buttons["Done"]
        if done.waitForExistence(timeout: 2) { done.tap() }
        // Leave the composer first, then relaunch: both paths must retain drafts.
        app.links["Journal"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 20))
        XCTAssertEqual(app.textViews.firstMatch.value as? String, marker)
        let save = app.buttons["Save check-in"]
        if !save.isHittable { app.swipeUp() }
        save.tap()
        XCTAssertTrue(app.staticTexts["Saved on this device. You can leave it here."].waitForExistence(timeout: 10))
        let edit = app.buttons["Edit note"].firstMatch
        if !edit.isHittable { app.swipeUp() }
        edit.tap()
        let editor = app.textViews["Edit note"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5), app.debugDescription)
        for _ in 0..<6 {
            if editor.frame.maxY < app.frame.height - 130 { break }
            app.swipeUp()
        }
        editor.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.9)).tap()
        editor.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: marker.count))
        let updated = marker + " revised"
        editor.typeText(updated)
        if done.waitForExistence(timeout: 2) { done.tap() }
        let saveChanges = app.buttons["Save changes"]
        if !saveChanges.isHittable { app.swipeUp() }
        saveChanges.tap()
        XCTAssertTrue(app.staticTexts[updated].waitForExistence(timeout: 10), app.debugDescription)
        app.buttons["Delete note"].firstMatch.tap()
        app.buttons["Confirm delete"].tap()
        XCTAssertTrue(app.buttons["Undo delete"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts[updated].exists)
        app.buttons["Undo delete"].tap()
        XCTAssertTrue(app.staticTexts[updated].waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts[updated].waitForExistence(timeout: 20), app.debugDescription)
        let emptyValue = app.textViews.firstMatch.value as? String ?? ""
        XCTAssertTrue(emptyValue.isEmpty || emptyValue == app.textViews.firstMatch.placeholderValue)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testBackupRecoveryCanBeCancelledWithoutChangingJournal() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20))
        app.links["Journal"].tap()
        let restore = app.buttons["Restore a backup"]
        XCTAssertTrue(restore.waitForExistence(timeout: 10), app.debugDescription)
        for _ in 0..<8 {
            if restore.isHittable { break }
            app.swipeUp()
        }
        restore.tap()
        XCTAssertTrue(app.buttons["Choose backup to restore"].waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertFalse(app.links["Journal"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let back = app.buttons["Back to journal"]
        if !back.isHittable { app.swipeUp() }
        back.tap()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 10), app.debugDescription)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20), app.debugDescription)
    }

    func testDictationDoesNotStartOnOpen() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        XCTAssertTrue(app.buttons["Dictate"].waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertFalse(app.buttons["Stop"].exists)
        XCTAssertFalse(app.buttons["Cancel dictation"].exists)
        // Capture the native capability result without opening the microphone.
        print("On-device dictation button enabled: \(app.buttons["Dictate"].isEnabled)")
        app.swipeUp()
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testReviewLinksToOriginalDay() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        XCTAssertTrue(app.links["Review"].waitForExistence(timeout: 20))
        app.links["Review"].tap()
        let source = app.links.matching(NSPredicate(format: "label CONTAINS %@", "Read this day")).firstMatch
        XCTAssertTrue(source.waitForExistence(timeout: 10), app.debugDescription)
        source.tap()
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Hide details for ")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10), app.debugDescription)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    /// Run after the save test, optionally after moving aside Library/WebKit.
    func testRestoreExistingJournal() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20))
        app.links["Journal"].tap()
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show details for ")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10))
        day.tap()
        let saved = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Simulator check-in ")).firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 15), app.debugDescription)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testSaveSurvivesRelaunch() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        let note = app.textViews.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 20), app.debugDescription)
        let marker = "Simulator check-in \(UUID().uuidString.prefix(8))"
        note.tap()
        note.typeText(marker)
        let done = app.toolbars.buttons["Done"]
        if done.waitForExistence(timeout: 3) { done.tap() }
        let save = app.buttons["Save check-in"]
        if !save.isHittable { app.swipeUp() }
        XCTAssertTrue(save.waitForExistence(timeout: 5), app.debugDescription)
        save.tap()
        XCTAssertTrue(app.staticTexts["Saved on this device. You can leave it here."].waitForExistence(timeout: 10), app.debugDescription)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20), app.debugDescription)
        app.links["Journal"].tap()
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show details for ")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10))
        day.tap()
        XCTAssertTrue(app.staticTexts[marker].waitForExistence(timeout: 15), app.debugDescription)
    }
}
