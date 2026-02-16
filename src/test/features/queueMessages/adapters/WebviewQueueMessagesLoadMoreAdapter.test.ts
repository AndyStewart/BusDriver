import * as assert from 'assert';
import {
    buildAppendMessagesCommand,
    buildEmptyAppendMessagesCommand,
    type LoadMoreQueueMessage
} from '../../../../features/queueMessages/adapters/WebviewQueueMessagesLoadMoreAdapter';

describe('queue load-more append command helpers', () => {
    it('marks hasMore when message count equals page size', () => {
        const messages: LoadMoreQueueMessage[] = [createMessage('1'), createMessage('2')];
        const command = buildAppendMessagesCommand([['r1'], ['r2']], messages, 2);

        assert.strictEqual(command.command, 'appendMessages');
        assert.strictEqual(command.hasMore, true);
        assert.strictEqual(command.messages.length, 2);
    });

    it('marks hasMore false when fewer messages than page size', () => {
        const messages: LoadMoreQueueMessage[] = [createMessage('1')];
        const command = buildAppendMessagesCommand([['r1']], messages, 2);

        assert.strictEqual(command.hasMore, false);
    });

    it('builds an empty append command payload', () => {
        const command = buildEmptyAppendMessagesCommand();

        assert.strictEqual(command.command, 'appendMessages');
        assert.deepStrictEqual(command.rows, []);
        assert.deepStrictEqual(command.messages, []);
        assert.strictEqual(command.hasMore, false);
    });
});

function createMessage(sequenceNumber: string): LoadMoreQueueMessage {
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
