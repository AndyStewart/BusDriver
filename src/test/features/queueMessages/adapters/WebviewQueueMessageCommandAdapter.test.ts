import * as assert from 'assert';
import type { Queue } from '../../../../features/queues/adapters/TreeQueueItemAdapter';
import { withSourceContext } from '../../../../features/queueMessages/adapters/WebviewQueueMessageCommandAdapter';

interface TestMessage {
    sequenceNumber: string;
    messageId: string;
    body: string;
    rawBody: unknown;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sourceQueue?: Queue;
    sourceConnectionString?: string;
}

describe('withSourceContext', () => {
    it('adds source context to a single message payload', () => {
        const queue: Queue = { name: 'source-queue', connectionId: 'source-connection' };
        const message = createMessage('1');

        const result = withSourceContext(message, queue, 'Endpoint=sb://source');

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].sourceQueue, queue);
        assert.strictEqual(result[0].sourceConnectionString, 'Endpoint=sb://source');
    });

    it('adds source context to all messages in an array payload', () => {
        const queue: Queue = { name: 'source-queue', connectionId: 'source-connection' };
        const messages = [createMessage('1'), createMessage('2')];

        const result = withSourceContext(messages, queue, 'Endpoint=sb://source');

        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].sourceQueue, queue);
        assert.strictEqual(result[1].sourceQueue, queue);
    });

    it('returns cloned message objects', () => {
        const queue: Queue = { name: 'source-queue', connectionId: 'source-connection' };
        const message = createMessage('1');

        const result = withSourceContext(message, queue, 'Endpoint=sb://source');

        assert.notStrictEqual(result[0], message);
        assert.strictEqual(message.sourceQueue, undefined);
    });
});

function createMessage(sequenceNumber: string): TestMessage {
    return {
        sequenceNumber,
        messageId: `message-${sequenceNumber}`,
        body: '{"status":"ok"}',
        rawBody: '{"status":"ok"}',
        properties: {},
        enqueuedTime: '2026-02-16T00:00:00Z',
        deliveryCount: 1
    };
}
