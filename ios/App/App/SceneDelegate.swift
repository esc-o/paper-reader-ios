import Capacitor
import UIKit
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var pendingPdf: (name: String, base64: String)?
    private var deliverTimer: Timer?
    private var delivering = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 0.969, green: 0.957, blue: 0.933, alpha: 1)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        capturePdfs(connectionOptions.urlContexts)
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        capturePdfs(URLContexts)
        let forwarded = URLContexts.filter { context in
            !(context.url.isFileURL && context.url.pathExtension.lowercased() == "pdf")
        }
        if !forwarded.isEmpty {
            SceneDelegateProxy.shared.scene(scene, openURLContexts: Set(forwarded))
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        scheduleDeliver()
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    private func capturePdfs(_ contexts: Set<UIOpenURLContext>) {
        for context in contexts {
            let url = context.url
            guard url.isFileURL, url.pathExtension.lowercased() == "pdf" else { continue }
            guard let payload = readPdf(url) else { continue }
            pendingPdf = payload
            scheduleDeliver()
        }
    }

    private func readPdf(_ url: URL) -> (name: String, base64: String)? {
        let accessing = url.startAccessingSecurityScopedResource()
        defer {
            if accessing { url.stopAccessingSecurityScopedResource() }
        }
        guard let data = try? Data(contentsOf: url), !data.isEmpty, data.count <= 80_000_000 else { return nil }
        return (url.lastPathComponent, data.base64EncodedString())
    }

    private func scheduleDeliver() {
        guard pendingPdf != nil else { return }
        deliverTimer?.invalidate()
        var attempts = 0
        deliverTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] timer in
            guard let self else {
                timer.invalidate()
                return
            }
            attempts += 1
            if attempts > 40 || self.pendingPdf == nil {
                timer.invalidate()
                return
            }
            if self.delivering { return }
            self.delivering = true
            let snapshot = self.pendingPdf?.base64
            self.tryDeliver { ok in
                self.delivering = false
                if ok && self.pendingPdf?.base64 == snapshot {
                    self.pendingPdf = nil
                    timer.invalidate()
                }
            }
        }
    }

    private func tryDeliver(completion: @escaping (Bool) -> Void) {
        guard let pendingPdf, let webView = (window?.rootViewController as? CAPBridgeViewController)?.webView else {
            completion(false)
            return
        }
        webView.evaluateJavaScript("window.__paperReaderNativeReady === true") { ready, error in
            DispatchQueue.main.async {
                guard error == nil, (ready as? Bool) == true else {
                    completion(false)
                    return
                }
                self.send(name: pendingPdf.name, base64: pendingPdf.base64, to: webView, completion: completion)
            }
        }
    }

    private func send(name: String, base64: String, to webView: WKWebView, completion: @escaping (Bool) -> Void) {
        let chunkSize = 180_000
        var chunks: [String] = []
        var index = base64.startIndex
        while index < base64.endIndex {
            let end = base64.index(index, offsetBy: chunkSize, limitedBy: base64.endIndex) ?? base64.endIndex
            chunks.append(String(base64[index..<end]))
            index = end
        }

        func step(_ cursor: Int) {
            let script: String
            if cursor == 0 {
                script = "window.__paperPdf = { name: \(jsString(name)), parts: [] }; true"
            } else if cursor <= chunks.count {
                script = "window.__paperPdf.parts.push(\(jsString(chunks[cursor - 1]))); true"
            } else {
                script = """
                window.dispatchEvent(new CustomEvent('paper-reader-import', { detail: { name: window.__paperPdf.name, base64: window.__paperPdf.parts.join('') } }));
                true
                """
            }
            webView.evaluateJavaScript(script) { _, error in
                DispatchQueue.main.async {
                    if error != nil {
                        completion(false)
                        return
                    }
                    if cursor > chunks.count {
                        completion(true)
                        return
                    }
                    step(cursor + 1)
                }
            }
        }
        step(0)
    }
}

private func jsString(_ value: String) -> String {
    guard let data = try? JSONSerialization.data(withJSONObject: [value]),
          let text = String(data: data, encoding: .utf8),
          text.count >= 2 else {
        return "\"\""
    }
    return String(text.dropFirst().dropLast())
}
