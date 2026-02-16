import * as assert from 'assert';
import { parseDroppedMessages } from '../../../../features/queueMessages/adapters/TreeDropMessageParserAdapter';

describe('parseDroppedMessages', () => {
    it('parses busdriver URI payloads', () => {
        const payload = [{
            sequenceNumber: '10',
            messageId: 'm-1',
            body: 'payload',
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00.000Z',
            deliveryCount: 1
        }];
        const uri = `busdriver-message:${encodeURIComponent(JSON.stringify(payload))}`;

        const parsed = parseDroppedMessages(uri, undefined);

        assert.ok(parsed);
        assert.strictEqual(parsed?.length, 1);
        assert.strictEqual(parsed?.[0]?.messageId, 'm-1');
    });

    it('falls back to text/plain when URI payload is not present', () => {
        const payload = [{
            sequenceNumber: '11',
            messageId: 'm-2',
            body: 'payload',
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00.000Z',
            deliveryCount: 1
        }];

        const parsed = parseDroppedMessages(undefined, JSON.stringify(payload));

        assert.ok(parsed);
        assert.strictEqual(parsed?.[0]?.messageId, 'm-2');
    });

    it('returns undefined for invalid payloads', () => {
        const parsed = parseDroppedMessages('busdriver-message:%7Bbad', '{not-json}');
        assert.strictEqual(parsed, undefined);
    });
});
