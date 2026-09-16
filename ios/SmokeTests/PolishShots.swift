import XCTest

/// Screenshot walkthrough for the UI polish pass. Runs against the installed
/// native app, captures named attachments of every primary screen so the
/// before/after states can be visually inspected.
final class PolishShots: XCTestCase {
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func dismissSystemDialogs() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<4 {
            let cancel = springboard.buttons["Cancel"]
            if cancel.waitForExistence(timeout: 2) {
                cancel.tap()
            } else {
                break
            }
        }
    }

    private func tapVisible(_ element: XCUIElement, in app: XCUIApplication) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), app.debugDescription)
        for _ in 0..<10 {
            let center = element.frame.midY
            if element.isHittable && center > 110 && center < app.frame.height - 110 { break }
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: center < 110 ? 0.7 : 0.3))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        element.tap()
    }

    private func dismissKeyboard(in app: XCUIApplication) {
        let done = app.toolbars.buttons["Done"]
        if done.waitForExistence(timeout: 2) {
            done.tap()
            return
        }
        if app.buttons["Hide keyboard"].waitForExistence(timeout: 2) {
            app.buttons["Hide keyboard"].tap()
            return
        }
        // iPhone keyboards have no Done affordance here — tapping inert text
        // blurs the field and drops the keyboard.
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap()
        if app.keyboards.firstMatch.waitForExistence(timeout: 1) {
            app.swipeDown()
        }
    }

    /// "Back" is a Button on ritual steps but a Link on utility pages — match either.
    private func backControl(in app: XCUIApplication) -> XCUIElement {
        let button = app.buttons["Back"]
        let link = app.links["Back"]
        return button.exists ? button : link
    }

    private func launch() -> XCUIApplication {
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        dismissSystemDialogs()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20), app.debugDescription)
        return app
    }

    func testPolishWalkthrough() {
        continueAfterFailure = true
        let app = launch()

        // A previous run may have left a non-default theme behind; reset to light.
        tapVisible(app.links["Settings"], in: app)
        let themeTab = app.buttons["Theme"]
        if themeTab.waitForExistence(timeout: 5) {
            themeTab.tap()
            sleep(1)
            let light = app.switches["Light"]
            if light.waitForExistence(timeout: 3) {
                light.tap()
            }
        }
        tapVisible(backControl(in: app), in: app)
        sleep(1)

        capture(app, "01-today-top")

        // Scroll to reveal the whole composer.
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        start.press(forDuration: 0.05, thenDragTo: end)
        capture(app, "02-today-composer")

        // Keyboard raised over the note field.
        let note = app.textViews.firstMatch
        if note.waitForExistence(timeout: 5) {
            tapVisible(note, in: app)
            sleep(1)
            capture(app, "03-today-keyboard")
            dismissKeyboard(in: app)
        }

        // Journal list, then an expanded day.
        tapVisible(app.links["Journal"], in: app)
        sleep(1)
        capture(app, "04-journal-collapsed")
        let dayToggle = app.buttons.matching(
            NSPredicate(format: "label CONTAINS %@", "Show details")
        ).firstMatch
        if dayToggle.waitForExistence(timeout: 5) {
            tapVisible(dayToggle, in: app)
            sleep(1)
            capture(app, "05-journal-expanded")
        }

        // Review.
        tapVisible(app.links["Review"], in: app)
        sleep(1)
        capture(app, "06-review")

        // Morning ritual first step — Back at step 0 must return to Today.
        tapVisible(app.links["Today"], in: app)
        let begin = app.links.matching(
            NSPredicate(format: "label BEGINSWITH %@", "Begin")
        ).firstMatch
        if begin.waitForExistence(timeout: 5) {
            tapVisible(begin, in: app)
            sleep(1)
            capture(app, "07-morning-ritual")
            let back = app.buttons["Back"]
            XCTAssertTrue(back.waitForExistence(timeout: 5), app.debugDescription)
            back.tap()
            XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 10))
        }

        // Breathing pause.
        let pause = app.links.matching(
            NSPredicate(format: "label BEGINSWITH %@", "Pause")
        ).firstMatch
        if pause.waitForExistence(timeout: 5) {
            tapVisible(pause, in: app)
            sleep(1)
            capture(app, "08-focus-breathing")
            tapVisible(backControl(in: app), in: app)
        }

        // Settings: all three tabs.
        tapVisible(app.links["Settings"], in: app)
        sleep(1)
        capture(app, "09-settings-habits")
        for (tab, name) in [("Notifications", "10-settings-notifications"), ("Theme", "11-settings-theme")] {
            let trigger = app.buttons[tab]
            if trigger.waitForExistence(timeout: 5) {
                tapVisible(trigger, in: app)
                sleep(1)
                capture(app, name)
            }
        }

        // Theme previews on Today: dark then sepia then back to light.
        for (name, label) in [("dark", "Dark"), ("sepia", "Sepia"), ("light", "Light")] {
            // Re-entering Settings resets the tabs to Habits, so select Theme again.
            let themeTab = app.buttons["Theme"]
            if themeTab.waitForExistence(timeout: 5) {
                themeTab.tap()
                sleep(1)
            }
            // aria-pressed buttons surface as Switch elements in WKWebView.
            let option = app.switches[label]
            XCTAssertTrue(option.waitForExistence(timeout: 5), "Missing \(label) theme option")
            option.tap()
            tapVisible(backControl(in: app), in: app)
            sleep(1)
            capture(app, "12-today-\(name)")
            if name != "light" {
                tapVisible(app.links["Settings"], in: app)
            }
        }
    }
}
