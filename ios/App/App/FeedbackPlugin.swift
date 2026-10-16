import Capacitor
import Foundation
import UIKit

/// Submits in-app feedback to Web3Forms with public URLSession APIs only.
@objc(FeedbackPlugin)
public class FeedbackPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FeedbackPlugin"
    public let jsName = "Feedback"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "submit", returnType: CAPPluginReturnPromise),
    ]

    @objc func submit(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "other"
        let message = call.getString("message")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let email = call.getString("email")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let loggedIn = call.getBool("loggedIn") ?? false

        guard !message.isEmpty else {
            call.reject("empty")
            return
        }

        let key = Secrets.web3formsKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, key != "在这里填" else {
            call.reject("missing_key")
            return
        }

        let typeLabel: String
        switch kind {
        case "bug":
            typeLabel = "Bug"
        case "suggestion":
            typeLabel = "建议"
        default:
            typeLabel = "其他"
        }

        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        let iosVersion = UIDevice.current.systemVersion
        let model = deviceModelIdentifier()

        var body: [String: Any] = [
            "access_key": key,
            "subject": "Paper Reader iOS 反馈：\(typeLabel)",
            "message": message,
            "type": typeLabel,
            "app_version": version,
            "build": build,
            "ios_version": iosVersion,
            "device_model": model,
            "logged_in": loggedIn ? "yes" : "no",
        ]
        if !email.isEmpty {
            body["email"] = email
            body["replyto"] = email
        }

        guard let url = URL(string: "https://api.web3forms.com/submit"),
              let payload = try? JSONSerialization.data(withJSONObject: body) else {
            call.reject("encode")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    call.reject("network")
                    return
                }
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                var ok = (200..<300).contains(status)
                if let data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let success = json["success"] as? Bool {
                    ok = success
                }
                if ok {
                    call.resolve()
                } else {
                    call.reject("server")
                }
            }
        }.resume()
    }

    /// Public POSIX `uname` machine id (e.g. iPhone15,2). Not a private API.
    private func deviceModelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        return withUnsafePointer(to: &systemInfo.machine) { pointer in
            pointer.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
        }
    }
}
