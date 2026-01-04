import type { Telemetry } from '../../ports/Telemetry';

export class VsCodeTelemetry implements Telemetry {
    trackEvent(_name: string, _properties?: Record<string, string>): void {
        // No-op until telemetry is wired.
    }

    trackError(_name: string, _error: Error, _properties?: Record<string, string>): void {
        // No-op until telemetry is wired.
    }
}
