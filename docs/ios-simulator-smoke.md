# iOS Simulator Smoke / PHS-103

Date: 2026-05-29

## Environment

- Xcode: 26.5 (build 17F42)
- Capacitor CLI: 8.3.4
- iOS platform package: `@capacitor/ios@8.3.4`
- Local notifications package: `@capacitor/local-notifications@8.2.0`
- Simulator: iPhone 17 Pro, iOS 26.5
- Device UDID: `A948F629-90D8-4317-8BCE-8205F6F74010`
- Bundle identifier: `app.anchor.ritual`
- App name: `Anchor`

## Commands Run

```bash
xcodebuild -version
npm run check:native
npm install @capacitor/ios@8.3.4 --save-dev
npm run mobile:add:ios
npx cap sync ios
xcodebuild -list -project ios/App/App.xcodeproj
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build
xcrun simctl boot A948F629-90D8-4317-8BCE-8205F6F74010
xcrun simctl install A948F629-90D8-4317-8BCE-8205F6F74010 ~/Library/Developer/Xcode/DerivedData/App-ebmfllubdoggdzbiarstlmfconsl/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch A948F629-90D8-4317-8BCE-8205F6F74010 app.anchor.ritual
xcrun simctl io A948F629-90D8-4317-8BCE-8205F6F74010 screenshot /tmp/anchor-ios-launch.png
npm run check:native
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build
xcrun simctl install A948F629-90D8-4317-8BCE-8205F6F74010 ~/Library/Developer/Xcode/DerivedData/App-ebmfllubdoggdzbiarstlmfconsl/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl terminate A948F629-90D8-4317-8BCE-8205F6F74010 app.anchor.ritual
xcrun simctl launch A948F629-90D8-4317-8BCE-8205F6F74010 app.anchor.ritual
xcrun simctl io A948F629-90D8-4317-8BCE-8205F6F74010 screenshot /tmp/anchor-ios-statusbar-config.png
npm install @capacitor/local-notifications@8.2.0 --save
npm run check:native
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build
xcrun simctl install A948F629-90D8-4317-8BCE-8205F6F74010 ~/Library/Developer/Xcode/DerivedData/App-ebmfllubdoggdzbiarstlmfconsl/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch A948F629-90D8-4317-8BCE-8205F6F74010 app.anchor.ritual
xcrun simctl get_app_container A948F629-90D8-4317-8BCE-8205F6F74010 app.anchor.ritual data
find ~/Library/Developer/CoreSimulator/Devices/A948F629-90D8-4317-8BCE-8205F6F74010/data/Library/UserNotifications -name PendingNotifications.plist -print -exec plutil -p {} \;
```

## Results

- `npm run check:native` passed: Node guard, typecheck, lint, 52 tests, web build, and native static export.
- `npm run mobile:add:ios` initially failed because `@capacitor/ios` was missing.
- Installing `@capacitor/ios@8.3.4` resolved the platform package blocker.
- Capacitor generated the `ios/` native scaffold and copied `out/` into `ios/App/App/public`.
- `npx cap sync ios` completed successfully.
- SwiftPM resolved Capacitor packages successfully.
- `xcodebuild` built the `App` scheme for iPhone 17 Pro simulator successfully.
- `simctl install` and `simctl launch` succeeded; launched process: `app.anchor.ritual`.
- WebKit logs show the bundled app page loaded inside the native WebView.
- Native status-bar safe area was fixed by setting Capacitor `StatusBar.overlaysWebView` to `false`, `style` to `LIGHT`, and `backgroundColor` to `#f8f3ec`.
- Fresh simulator screenshot after the fix: `/tmp/anchor-ios-statusbar-config.png`.
- Manual simulator smoke completed through Computer Use:
  - opened app from landing;
  - completed morning ritual;
  - completed evening ritual;
  - opened Timeline and confirmed the completed day appeared;
  - terminated and relaunched the app, then confirmed ritual completion persisted;
  - opened Settings and checked habits, reminders, and theme tabs.
- Native reminder implementation smoke:
  - Settings reminders tab uses the Capacitor local notification adapter in the iOS app.
  - iOS permission prompt appeared: `"Anchor" Would Like to Send You Notifications`.
  - After tapping Allow, the UI changed to `Native reminders enabled`.
  - `PendingNotifications.plist` contains two Anchor pending notifications:
    - ID `8101`, title `Morning ritual`, schedule hour `8`, minute `0`.
    - ID `8102`, title `Evening ritual`, schedule hour `20`, minute `0`.
    - Both use `threadIdentifier: anchor-reminders` and Anchor `cap_extra` metadata.

## Findings

- Fixed: first launch showed the landing header/content overlapping the iPhone 17 Pro Dynamic Island/status area. Root cause was the default Capacitor StatusBar overlay mode.
- `PHS-140` tracks and is resolved by the safe-area/status-bar config change.
- Fixed: native iOS reminders no longer report `Not supported here`. The iOS app now requests local notification permission and schedules daily morning/evening reminders with stable notification IDs.
- Note: the foreground `Send test` button did not show a visible banner while the app was active in this simulator run. The daily pending reminder records were verified through the simulator notification store instead.
- Keyboard/text input worked in the simulator, but the simulator keyboard was set to a Russian layout during the typed reflection check, so the entered Latin test text appeared as keyboard-layout-mapped characters. This is an environment/input-method note, not an app data-loss issue.

## Smoke Checklist Result

1. `Open app` / `Try it now`: passed.
2. Morning ritual completion: passed.
3. Evening ritual completion: passed.
4. Timeline completed-day visibility: passed.
5. Persistence after terminate/relaunch: passed.
6. Settings habits tab: passed.
7. Settings reminders tab: passed; native permission prompt, enabled state, and pending daily reminders verified.
8. Settings theme tab: passed.
