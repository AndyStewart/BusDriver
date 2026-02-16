import * as assert from 'assert';
import type { QueueMessage } from '../../ports/secondary/MessageOperations';
import { formatMessageBody } from '../../providers/queueMessageBody';

describe('formatMessageBody', () => {
    it('keeps string bodies as raw strings', () => {
        const message: QueueMessage = {
            body: '{"status":"ok"}',
            messageId: 'id-1',
            properties: {},
            enqueuedTime: 'time',
            deliveryCount: 1,
            sequenceNumber: '1'
        };

        const result = formatMessageBody(message);

        assert.strictEqual(result.displayBody, '{"status":"ok"}');
        assert.strictEqual(result.rawBody, '{"status":"ok"}');
    });

    it('preserves object bodies for resending', () => {
        const message: QueueMessage = {
            body: { status: 'ok', count: 2 },
            messageId: 'id-2',
            properties: {},
            enqueuedTime: 'time',
            deliveryCount: 1,
            sequenceNumber: '2'
        };

        const result = formatMessageBody(message);

        assert.strictEqual(result.rawBody, message.body);
        assert.strictEqual(result.displayBody, JSON.stringify(message.body, null, 2));
    });

    it('parses JSON buffers into objects for resending', () => {
        const message: QueueMessage = {
            body: Buffer.from('{"status":"ok"}'),
            messageId: 'id-3',
            properties: {},
            enqueuedTime: 'time',
            deliveryCount: 1,
            sequenceNumber: '3'
        };

        const result = formatMessageBody(message);

        assert.deepStrictEqual(result.rawBody, { status: 'ok' });
        assert.strictEqual(result.displayBody, JSON.stringify({ status: 'ok' }, null, 2));
    });

    it('keeps non-JSON buffers as strings', () => {
        const message: QueueMessage = {
            body: Buffer.from('plain-text'),
            messageId: 'id-4',
            properties: {},
            enqueuedTime: 'time',
            deliveryCount: 1,
            sequenceNumber: '4'
        };

        const result = formatMessageBody(message);

        assert.strictEqual(result.rawBody, 'plain-text');
        assert.strictEqual(result.displayBody, 'plain-text');
    });
});
