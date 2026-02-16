export interface Telemetry {
    trackEvent(name: string, properties?: Record<string, string>): void;
    trackError(name: string, error: Error, properties?: Record<string, string>): void;
}
