import type { Telemetry } from '../../ports/Telemetry';

export class VsCodeTelemetry implements Telemetry {
    trackEvent(name: string, properties?: Record<string, string>): void {
        void name;
        void properties;
        // No-op until telemetry is wired.
    }

    trackError(name: string, error: Error, properties?: Record<string, string>): void {
        void name;
        void error;
        void properties;
        // No-op until telemetry is wired.
    }
}
