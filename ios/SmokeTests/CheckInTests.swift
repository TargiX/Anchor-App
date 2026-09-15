import XCTest

/// Runs against the already installed native app, with its real WKWebView storage.
final class CheckInTests: XCTestCase {
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
