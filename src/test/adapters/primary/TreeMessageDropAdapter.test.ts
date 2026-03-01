import * as assert from 'assert';
import type { DroppedMessage } from '../../../adapters/primary/TreeDropMessageParserAdapter';
import type { Queue } from '../../../adapters/primary/TreeQueueItemAdapter';
import type { QueueMessage as QueueMessageData } from '../../../adapters/primary/WebviewQueueMessagesPanelAdapter';
import {
    mapMoveMessageToDomain,
    selectDropMessages,
} from '../../../adapters/primary/TreeMessageDropAdapter';

describe('ConnectionsProvider drop resolution', () => {
    it('prefers pending drag data over parsed drop payloads', () => {
        const pending: QueueMessageData = createQueueMessage({ messageId: 'pending-1' });
        const parsed = [createDroppedMessage({ messageId: 'parsed-1' })];

        const selected = selectDropMessages(pending, parsed);

        assert.strictEqual(selected?.length, 1);
        assert.strictEqual(selected?.[0].messageId, 'pending-1');
    });

    it('uses parsed payloads when pending drag data is absent', () => {
        const parsed = [createDroppedMessage({ messageId: 'parsed-1' })];

        const selected = selectDropMessages(undefined, parsed);

        assert.strictEqual(selected?.length, 1);
        assert.strictEqual(selected?.[0].messageId, 'parsed-1');
    });

    it('returns undefined when no valid payloads are available', () => {
        const selected = selectDropMessages(undefined, undefined);

        assert.strictEqual(selected, undefined);
    });

    it('maps queue panel message with raw body and source context', () => {
        const sourceQueue: Queue = { name: 'source-queue', connectionId: 'source-conn' };
        const queueMessage = createQueueMessage({
            rawBody: { nested: true },
            sourceQueue,
            sourceConnectionString: 'Endpoint=sb://source'
        });

        const mapped = mapMoveMessageToDomain(queueMessage);

        assert.deepStrictEqual(mapped.body, { nested: true });
        assert.deepStrictEqual(mapped.source, {
            queueName: 'source-queue',
            connectionString: 'Endpoint=sb://source'
        });
    });

    it('maps dropped messages without source context', () => {
        const dropped = createDroppedMessage({ body: '{"status":"ok"}' });

        const mapped = mapMoveMessageToDomain(dropped);

        assert.strictEqual(mapped.body, '{"status":"ok"}');
        assert.strictEqual(mapped.source, undefined);
    });
});

function createQueueMessage(overrides: Partial<QueueMessageData> = {}): QueueMessageData {
    return {
        sequenceNumber: '1',
        messageId: 'message-1',
        body: '{"hello":"world"}',
        rawBody: '{"hello":"world"}',
        properties: {},
        enqueuedTime: '2026-02-16T00:00:00Z',
        deliveryCount: 1,
        ...overrides
    };
}

function createDroppedMessage(overrides: Partial<DroppedMessage> = {}): DroppedMessage {
    return {
        sequenceNumber: '2',
        messageId: 'dropped-1',
        body: 'plain-body',
        properties: {},
        enqueuedTime: '2026-02-16T00:00:00Z',
        deliveryCount: 1,
        ...overrides
    };
}
