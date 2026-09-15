import XCTest

/// Runs against the already installed native app, with its real WKWebView storage.
final class CheckInTests: XCTestCase {
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
        XCTAssertTrue(app.links["History"].waitForExistence(timeout: 20), app.debugDescription)
        app.links["History"].tap()
        XCTAssertTrue(app.staticTexts[marker].waitForExistence(timeout: 15), app.debugDescription)
    }
}
