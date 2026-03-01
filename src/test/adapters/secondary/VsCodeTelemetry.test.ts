import * as assert from 'assert';
import { VsCodeTelemetry } from '../../../adapters/secondary/VsCodeTelemetryAdapter';

describe('VsCodeTelemetry', () => {
    it('track calls are no-ops', () => {
        const telemetry = new VsCodeTelemetry();

        assert.doesNotThrow(() => {
            telemetry.trackEvent('event');
            telemetry.trackError('error', new Error('boom'));
        });
    });
});
