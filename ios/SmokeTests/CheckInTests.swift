import XCTest

/// Runs against the already installed native app, with its real WKWebView storage.
final class CheckInTests: XCTestCase {
    private func tapVisible(_ element: XCUIElement, in app: XCUIApplication) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), app.debugDescription)
        for _ in 0..<10 {
            let center = element.frame.midY
            let keyboard = app.keyboards.firstMatch
            let bottom = keyboard.exists ? keyboard.frame.minY : app.frame.maxY
            if element.isHittable && center > 90 && center < bottom - 110 { break }
            let origin = app.coordinate(withNormalizedOffset: .zero)
            let start = origin.withOffset(CGVector(dx: app.frame.width * 0.5, dy: bottom * 0.5))
            let end = origin.withOffset(CGVector(dx: app.frame.width * 0.5, dy: bottom * (center < 90 ? 0.7 : 0.3)))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        element.tap()
    }

    private func dismissKeyboard(in app: XCUIApplication) {
        let done = app.buttons["Done"]
        if done.exists {
            done.tap()
        } else if app.buttons["Hide keyboard"].waitForExistence(timeout: 3) {
            app.buttons["Hide keyboard"].tap()
        }
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testMorningAndEveningRituals() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 15))
        app.links.matching(NSPredicate(format: "label BEGINSWITH %@", "Begin ")).firstMatch.tap()
        tapVisible(app.buttons["Begin the ritual"], in: app)
        XCTAssertTrue(app.staticTexts["How did last night feel?"].waitForExistence(timeout: 10))
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch.tap()
        tapVisible(app.buttons["Continue"], in: app)
        XCTAssertTrue(app.staticTexts["Where are you right now?"].waitForExistence(timeout: 10))
        app.sliders.firstMatch.tap()
        tapVisible(app.buttons["Continue"], in: app)
        let intention = app.textViews.firstMatch
        XCTAssertTrue(intention.waitForExistence(timeout: 10))
        tapVisible(intention, in: app)
        intention.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.9)).tap()
        if let current = intention.value as? String, current != intention.placeholderValue {
            intention.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
        }
        intention.typeText("Release QA intention")
        dismissKeyboard(in: app)
        tapVisible(app.buttons["Continue"], in: app)
        XCTAssertTrue(app.staticTexts["Want to start with a moment of stillness?"].waitForExistence(timeout: 10))
        tapVisible(app.buttons["Skip"], in: app)
        tapVisible(app.buttons["Back to app"], in: app)
        XCTAssertTrue(app.staticTexts["The day is anchored."].waitForExistence(timeout: 10))
        capture(app, "morning-complete")
        tapVisible(app.buttons["Into the day"], in: app)
        XCTAssertTrue(app.staticTexts["Release QA intention"].waitForExistence(timeout: 10))
        tapVisible(app.links.matching(NSPredicate(format: "label BEGINSWITH %@", "Reflect ")).firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["Where are you right now?"].waitForExistence(timeout: 10))
        app.sliders.firstMatch.tap()
        tapVisible(app.buttons["Continue"], in: app)
        let reflection = app.textViews.firstMatch
        XCTAssertTrue(reflection.waitForExistence(timeout: 10))
        tapVisible(reflection, in: app)
        reflection.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.9)).tap()
        if let current = reflection.value as? String, current != reflection.placeholderValue {
            reflection.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
        }
        reflection.typeText("Release QA evening reflection")
        dismissKeyboard(in: app)
        tapVisible(app.buttons["Continue"], in: app)
        XCTAssertTrue(app.staticTexts["How did your habits land today?"].waitForExistence(timeout: 10))
        tapVisible(app.buttons["Continue"], in: app)
        XCTAssertTrue(app.staticTexts["Set yourself up for a good night."].waitForExistence(timeout: 10))
        tapVisible(app.buttons["Continue"], in: app)
        tapVisible(app.buttons["Done"], in: app)
        XCTAssertTrue(app.staticTexts["The day is closed."].waitForExistence(timeout: 10))
        capture(app, "evening-complete")
        tapVisible(app.buttons["Toward rest"], in: app)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Release QA intention"].waitForExistence(timeout: 15))
    }

    func testComposerKeepsOptionalDraft() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        let save = app.buttons["Save check-in"]
        XCTAssertTrue(save.waitForExistence(timeout: 15))
        capture(app, "compact-today")
        XCTAssertFalse(app.textFields["One small next step (optional)"].exists)
        tapVisible(app.buttons["Add a next step (optional)"], in: app)
        let step = app.textFields.firstMatch
        tapVisible(step, in: app)
        step.typeText("A quiet walk")
        dismissKeyboard(in: app)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.textFields.firstMatch.waitForExistence(timeout: 15))
        XCTAssertEqual(app.textFields.firstMatch.value as? String, "A quiet walk")
        tapVisible(app.textFields.firstMatch, in: app)
        app.textFields.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        app.textFields.firstMatch.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 12))
        dismissKeyboard(in: app)
    }

    func testFocusCanStartPauseAndReturn() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 15))
        tapVisible(app.links.matching(NSPredicate(format: "label BEGINSWITH %@", "Pause ")).firstMatch, in: app)
        let start = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Start ")).firstMatch
        tapVisible(start, in: app)
        XCTAssertTrue(app.switches["Pause"].waitForExistence(timeout: 10))
        app.switches["Pause"].tap()
        XCTAssertTrue(start.waitForExistence(timeout: 10))
        capture(app, "focus-paused")
        app.links["Back"].tap()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 10))
    }

    func testLocalSettingsAccessible() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        let settings = app.links["Settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 15), app.debugDescription)
        settings.tap()
        XCTAssertTrue(app.staticTexts["Your habits"].waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.buttons["Add habit"].exists, app.debugDescription)
        let name = "QA habit \(UUID().uuidString.prefix(6))"
        let habit = app.textFields["New habit"]
        tapVisible(habit, in: app)
        habit.typeText(name)
        dismissKeyboard(in: app)
        tapVisible(app.buttons["Add habit"], in: app)
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 10))
        for _ in 0..<5 { app.swipeDown() }
        app.buttons["Theme"].tap()
        tapVisible(app.switches.matching(NSPredicate(format: "label ==[c] %@", "dark")).firstMatch, in: app)
        let dark = app.switches.matching(NSPredicate(format: "label ==[c] %@", "dark")).firstMatch
        XCTAssertLessThanOrEqual(dark.frame.maxX, app.frame.maxX, "Theme controls must fit the viewport after text entry")
        capture(app, "settings-dark")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Settings"].waitForExistence(timeout: 15))
        app.links["Settings"].tap()
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 10))
        app.buttons["Theme"].tap()
        XCTAssertEqual(app.switches.matching(NSPredicate(format: "label ==[c] %@", "dark")).firstMatch.value as? String, "1")
        tapVisible(app.switches.matching(NSPredicate(format: "label ==[c] %@", "sepia")).firstMatch, in: app)
        capture(app, "settings-sepia")
        tapVisible(app.switches.matching(NSPredicate(format: "label ==[c] %@", "light")).firstMatch, in: app)
        app.buttons["Notifications"].tap()
        XCTAssertTrue(app.staticTexts["Ritual reminders"].waitForExistence(timeout: 10))
        capture(app, "settings-reminders")
        app.buttons["Habits"].tap()
        tapVisible(app.buttons["Remove \(name)"], in: app)
        XCTAssertFalse(app.staticTexts[name].exists)
        tapVisible(app.links["Privacy Policy"], in: app)
        XCTAssertTrue(app.staticTexts["Optional accounts and sync"].waitForExistence(timeout: 10))
        capture(app, "privacy")
        for _ in 0..<8 { app.swipeDown() }
        app.links["Back to settings"].tap()
        XCTAssertTrue(app.staticTexts["Your habits"].waitForExistence(timeout: 10), app.debugDescription)
    }

    func testInstalledReleaseOpensJournal() {
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.textViews.firstMatch.exists, app.debugDescription)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 10))
        app.links["Journal"].tap()
        XCTAssertTrue(app.links["Today"].waitForExistence(timeout: 10))
        app.links["Today"].tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 10))
    }

    func testLandscapeNavigation() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        defer { XCUIDevice.shared.orientation = .portrait }
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 15), app.debugDescription)
        app.links["Journal"].tap()
        XCTAssertTrue(app.links["Today"].waitForExistence(timeout: 10))
        app.links["Today"].tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 10))
        capture(app, "landscape-today")
        XCUIDevice.shared.orientation = .portrait
        app.links["Settings"].tap()
        XCTAssertTrue(app.staticTexts["Your habits"].waitForExistence(timeout: 10))
    }

    func testDraftThenEditDeleteAndUndo() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.terminate()
        app.launch()
        let note = app.textViews.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 20), app.debugDescription)
        let inputMarker = "Journal editing \(UUID().uuidString.prefix(8))"
        tapVisible(note, in: app)
        note.typeText(inputMarker)
        let marker = note.value as? String ?? ""
        XCTAssertTrue(marker.contains(inputMarker))
        dismissKeyboard(in: app)
        // Leave the composer first, then relaunch: both paths must retain drafts.
        app.links["Journal"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 20))
        XCTAssertEqual(app.textViews.firstMatch.value as? String, marker)
        let save = app.buttons["Save check-in"]
        tapVisible(save, in: app)
        XCTAssertTrue(app.staticTexts["Saved on this device. You can leave it here."].waitForExistence(timeout: 10))
        tapVisible(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Note actions")).firstMatch, in: app)
        capture(app, "note-actions-menu")
        let edit = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Edit note")).firstMatch
        if !edit.isHittable { app.swipeUp() }
        edit.tap()
        let editor = app.textViews["Edit note"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5), app.debugDescription)
        tapVisible(editor, in: app)
        editor.typeText(" revised")
        let rawUpdated = editor.value as? String ?? ""
        XCTAssertEqual(rawUpdated.count, marker.count + " revised".count)
        XCTAssertTrue(rawUpdated.contains(" revised"))
        let updated = rawUpdated.trimmingCharacters(in: .whitespacesAndNewlines)
        dismissKeyboard(in: app)
        let saveChanges = app.buttons["Save changes"]
        tapVisible(saveChanges, in: app)
        XCTAssertTrue(app.staticTexts[updated].waitForExistence(timeout: 10), app.debugDescription)
        tapVisible(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Note actions")).firstMatch, in: app)
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Delete note")).firstMatch.tap()
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
        tapVisible(restore, in: app)
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
        tapVisible(app.buttons["Use dictation"], in: app)
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

    /// Self-sufficient: saves its own entry, relaunches, verifies it restores.
    /// Safe to run standalone or after moving aside Library/WebKit.
    func testRestoreExistingJournal() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.anchor.ritual")
        app.launch()
        let note = app.textViews.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 20), app.debugDescription)
        let marker = "Simulator check-in \(UUID().uuidString.prefix(8))"
        tapVisible(note, in: app)
        note.typeText(marker)
        let savedText = note.value as? String ?? ""
        XCTAssertTrue(savedText.contains(marker))
        dismissKeyboard(in: app)
        tapVisible(app.buttons["Save check-in"], in: app)
        XCTAssertTrue(app.staticTexts["Saved on this device. You can leave it here."].waitForExistence(timeout: 10), app.debugDescription)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20))
        app.links["Journal"].tap()
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show details for ")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10))
        day.tap()
        XCTAssertTrue(app.staticTexts[savedText].waitForExistence(timeout: 15), app.debugDescription)
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
        tapVisible(note, in: app)
        note.typeText(marker)
        let savedText = note.value as? String ?? ""
        XCTAssertTrue(savedText.contains(marker))
        dismissKeyboard(in: app)
        let save = app.buttons["Save check-in"]
        tapVisible(save, in: app)
        XCTAssertTrue(app.staticTexts["Saved on this device. You can leave it here."].waitForExistence(timeout: 10), app.debugDescription)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.links["Journal"].waitForExistence(timeout: 20), app.debugDescription)
        app.links["Journal"].tap()
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show details for ")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10))
        day.tap()
        XCTAssertTrue(app.staticTexts[savedText].waitForExistence(timeout: 15), app.debugDescription)
    }
}
