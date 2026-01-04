import * as assert from 'assert';
import { VsCodeLogger } from '../../adapters/vscode/VsCodeLogger';

describe('VsCodeLogger', () => {
    it('info forwards message and metadata', () => {
        const logger = new VsCodeLogger();
        const original = console.log;
        const calls: unknown[][] = [];
        console.log = (...args: unknown[]) => {
            calls.push(args);
        };

        try {
            logger.info('hello', { source: 'test' });
        } finally {
            console.log = original;
        }

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0], ['hello', { source: 'test' }]);
    });
});
