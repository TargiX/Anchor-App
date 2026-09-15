import Capacitor
import Foundation

/// Next exports one HTML document per route; Capacitor defaults to a single index.
final class AnchorBridgeViewController: CAPBridgeViewController {
    override func router() -> Router {
        return NextExportRouter()
    }
}

struct NextExportRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        let root = URL(fileURLWithPath: basePath, isDirectory: true).standardizedFileURL
        let requested = root.appendingPathComponent(path).standardizedFileURL
        guard requested.path == root.path || requested.path.hasPrefix(root.path + "/") else {
            return root.appendingPathComponent("404.html").path
        }
        if requested.pathExtension.isEmpty {
            let index = requested.appendingPathComponent("index.html")
            return FileManager.default.fileExists(atPath: index.path)
                ? index.path : root.appendingPathComponent("404.html").path
        }
        return requested.path
    }
}
