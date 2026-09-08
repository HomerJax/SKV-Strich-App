import Foundation
import Capacitor
import UserNotifications
import SwiftUI

#if canImport(AlarmKit)
import AlarmKit
import ActivityKit
#endif

@objc(GameTimerAlarmPlugin)
public class GameTimerAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameTimerAlarmPlugin"
    public let jsName = "GameTimerAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private let defaultsPrefix = "strikr.gameTimer.alarm."

    @objc public func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            #if canImport(AlarmKit)
            if #available(iOS 26.0, *) {
                do {
                    let state = try await AlarmManager.shared.requestAuthorization()
                    call.resolve([
                        "granted": state == .authorized,
                        "mode": "alarmkit",
                    ])
                } catch {
                    call.reject("Alarm-Berechtigung konnte nicht angefragt werden.", nil, error)
                }
                return
            }
            #endif

            do {
                let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                    options: [.alert, .sound]
                )
                call.resolve([
                    "granted": granted,
                    "mode": "notification",
                ])
            } catch {
                call.reject("Benachrichtigungs-Berechtigung konnte nicht angefragt werden.", nil, error)
            }
        }
    }

    @objc public func schedule(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("Alarm-Key fehlt.")
            return
        }

        guard let atEpochMs = call.getDouble("atEpochMs"), atEpochMs > 0 else {
            call.reject("Alarm-Zeit fehlt.")
            return
        }

        let kind = call.getString("kind") == "halftime" ? "halftime" : "final"
        let sound = normalizedSound(call.getString("sound"))
        let date = Date(timeIntervalSince1970: atEpochMs / 1000.0)

        guard date.timeIntervalSinceNow > 0.5 else {
            call.reject("Alarm-Zeit liegt bereits zurück.")
            return
        }

        do {
            let soundFile = try ensureSoundFile(for: sound)

            #if canImport(AlarmKit)
            if #available(iOS 26.0, *) {
                Task {
                    do {
                        try await scheduleAlarmKit(
                            key: key,
                            date: date,
                            kind: kind,
                            soundFile: soundFile
                        )
                        call.resolve(["ok": true])
                    } catch {
                        call.reject("Alarm konnte nicht geplant werden.", nil, error)
                    }
                }
                return
            }
            #endif

            scheduleNotificationFallback(
                key: key,
                date: date,
                kind: kind,
                soundFile: soundFile,
                call: call
            )
        } catch {
            call.reject("Alarmton konnte nicht vorbereitet werden.", nil, error)
        }
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("Alarm-Key fehlt.")
            return
        }

        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [key])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [key])

        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                if let id = storedAlarmId(for: key) {
                    do {
                        try AlarmManager.shared.cancel(id: id)
                    } catch {
                        // Der System-Stop kann einen Alarm bereits entfernt haben.
                    }
                }
                clearStoredAlarmId(for: key)
                call.resolve(["ok": true])
            }
            return
        }
        #endif

        clearStoredAlarmId(for: key)
        call.resolve(["ok": true])
    }

    private func normalizedSound(_ raw: String?) -> String {
        switch raw {
        case "horn": return "horn"
        case "buzzer": return "buzzer"
        default: return "whistle"
        }
    }

    private func title(for kind: String) -> String {
        kind == "halftime" ? "HALBZEIT" : "ABPFIFF"
    }

    private func body(for kind: String) -> String {
        kind == "halftime"
            ? "Die erste Halbzeit ist vorbei."
            : "Die Spielzeit ist beendet."
    }

    private func storageKey(for key: String) -> String {
        defaultsPrefix + key
    }

    private func storedAlarmId(for key: String) -> UUID? {
        guard let value = UserDefaults.standard.string(forKey: storageKey(for: key)) else {
            return nil
        }
        return UUID(uuidString: value)
    }

    private func storeAlarmId(_ id: UUID, for key: String) {
        UserDefaults.standard.set(id.uuidString, forKey: storageKey(for: key))
    }

    private func clearStoredAlarmId(for key: String) {
        UserDefaults.standard.removeObject(forKey: storageKey(for: key))
    }

    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private struct StrikrAlarmMetadata: AlarmMetadata, Codable, Hashable {
        let kind: String
    }

    @available(iOS 26.0, *)
    private func scheduleAlarmKit(
        key: String,
        date: Date,
        kind: String,
        soundFile: String
    ) async throws {
        if let previous = storedAlarmId(for: key) {
            try? AlarmManager.shared.cancel(id: previous)
        }

        let alarmId = UUID()
        let alertTitle: LocalizedStringResource = kind == "halftime" ? "Halbzeit" : "Abpfiff"
        let alert = AlarmPresentation.Alert(
            title: alertTitle,
            secondaryButton: nil,
            secondaryButtonBehavior: nil
        )
        let presentation = AlarmPresentation(alert: alert)
        let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: StrikrAlarmMetadata(kind: kind),
            tintColor: Color.red
        )
        let configuration = AlarmManager.AlarmConfiguration<StrikrAlarmMetadata>.alarm(
            schedule: .fixed(date),
            attributes: attributes,
            stopIntent: nil,
            secondaryIntent: nil,
            sound: .named(soundFile)
        )

        _ = try await AlarmManager.shared.schedule(id: alarmId, configuration: configuration)
        storeAlarmId(alarmId, for: key)
    }
    #endif

    private func scheduleNotificationFallback(
        key: String,
        date: Date,
        kind: String,
        soundFile: String,
        call: CAPPluginCall
    ) {
        let content = UNMutableNotificationContent()
        content.title = title(for: kind)
        content.body = body(for: kind)
        content.sound = UNNotificationSound(
            named: UNNotificationSoundName(rawValue: soundFile)
        )
        content.interruptionLevel = .timeSensitive

        let interval = max(1.0, date.timeIntervalSinceNow)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: key, content: content, trigger: trigger)

        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [key])
        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                call.reject("Alarm konnte nicht geplant werden.", nil, error)
            } else {
                call.resolve(["ok": true])
            }
        }
    }

    private func ensureSoundFile(for sound: String) throws -> String {
        let fileName = "strikr_\(sound).wav"
        let fileManager = FileManager.default
        let library = try fileManager.url(
            for: .libraryDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let soundsDirectory = library.appendingPathComponent("Sounds", isDirectory: true)
        try fileManager.createDirectory(
            at: soundsDirectory,
            withIntermediateDirectories: true,
            attributes: nil
        )
        let target = soundsDirectory.appendingPathComponent(fileName)

        if !fileManager.fileExists(atPath: target.path) {
            let wave = makeAlarmWave(sound: sound)
            try wave.write(to: target, options: .atomic)
        }

        return fileName
    }

    private func makeAlarmWave(sound: String) -> Data {
        let sampleRate = 22_050
        let durationSeconds = 26.0
        let sampleCount = Int(Double(sampleRate) * durationSeconds)
        var pcm = Data(capacity: sampleCount * 2)

        for index in 0..<sampleCount {
            let t = Double(index) / Double(sampleRate)
            let value = sampleValue(sound: sound, time: t)
            var sample = Int16(max(-1.0, min(1.0, value)) * Double(Int16.max)).littleEndian
            withUnsafeBytes(of: &sample) { bytes in
                pcm.append(contentsOf: bytes)
            }
        }

        var data = Data()
        data.append("RIFF".data(using: .ascii)!)
        appendUInt32(UInt32(36 + pcm.count), to: &data)
        data.append("WAVE".data(using: .ascii)!)
        data.append("fmt ".data(using: .ascii)!)
        appendUInt32(16, to: &data)
        appendUInt16(1, to: &data)
        appendUInt16(1, to: &data)
        appendUInt32(UInt32(sampleRate), to: &data)
        appendUInt32(UInt32(sampleRate * 2), to: &data)
        appendUInt16(2, to: &data)
        appendUInt16(16, to: &data)
        data.append("data".data(using: .ascii)!)
        appendUInt32(UInt32(pcm.count), to: &data)
        data.append(pcm)
        return data
    }

    private func sampleValue(sound: String, time: Double) -> Double {
        let twoPi = Double.pi * 2.0

        switch sound {
        case "horn":
            let cycle = time.truncatingRemainder(dividingBy: 1.4)
            guard cycle < 0.9 else { return 0 }
            let envelope = min(1.0, cycle / 0.04) * min(1.0, (0.9 - cycle) / 0.08)
            return sin(twoPi * 390.0 * time) * 0.72 * envelope
        case "buzzer":
            let cycle = time.truncatingRemainder(dividingBy: 0.55)
            guard cycle < 0.32 else { return 0 }
            let sine = sin(twoPi * 235.0 * time)
            return (sine >= 0 ? 0.62 : -0.62)
        default:
            let cycle = time.truncatingRemainder(dividingBy: 1.25)
            let pulse = cycle.truncatingRemainder(dividingBy: 0.36)
            guard cycle < 1.05, pulse < 0.25 else { return 0 }
            let progress = pulse / 0.25
            let frequency = 1700.0 + (900.0 * progress)
            return sin(twoPi * frequency * time) * 0.68
        }
    }

    private func appendUInt16(_ value: UInt16, to data: inout Data) {
        var little = value.littleEndian
        withUnsafeBytes(of: &little) { data.append(contentsOf: $0) }
    }

    private func appendUInt32(_ value: UInt32, to data: inout Data) {
        var little = value.littleEndian
        withUnsafeBytes(of: &little) { data.append(contentsOf: $0) }
    }
}

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameTimerAlarmPlugin())
    }
}
