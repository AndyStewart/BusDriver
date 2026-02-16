import * as assert from 'assert';
import {
    summarizeDeleteResult,
    summarizeMoveResult
} from '../../../../features/queueMessages/adapters/CommandMessageOperationSummaryAdapter';

describe('message operation summaries', () => {
    it('returns success summary for fully successful moves', () => {
        const summary = summarizeMoveResult('target-queue', 2, {
            successful: [
                { messageId: 'm1' },
                { messageId: 'm2' }
            ],
            failed: []
        });

        assert.strictEqual(summary.level, 'info');
        assert.strictEqual(summary.message, 'Successfully moved 2 messages to target-queue');
    });

    it('returns partial summary for partially failed moves', () => {
        const summary = summarizeMoveResult('target-queue', 2, {
            successful: [
                { messageId: 'm1' }
            ],
            failed: [
                { message: { messageId: 'm2' }, error: 'boom' }
            ]
        });

        assert.strictEqual(summary.level, 'warning');
        assert.strictEqual(
            summary.message,
            'Moved 1 of 2 messages to target-queue. Failed: m2 (boom)'
        );
    });

    it('returns failure summary for fully failed deletes', () => {
        const summary = summarizeDeleteResult('source-queue', 1, {
            successful: [],
            failed: [
                { message: { messageId: 'm1' }, error: 'not found' }
            ]
        });

        assert.strictEqual(summary.level, 'error');
        assert.strictEqual(
            summary.message,
            'Failed to delete 1 message(s) from source-queue. IDs: m1'
        );
    });

    it('returns success summary for single delete', () => {
        const summary = summarizeDeleteResult('source-queue', 1, {
            successful: [
                { messageId: 'm1' }
            ],
            failed: []
        });

        assert.strictEqual(summary.level, 'info');
        assert.strictEqual(summary.message, 'Message deleted from source-queue');
    });
});
