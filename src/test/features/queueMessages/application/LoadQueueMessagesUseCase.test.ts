import * as assert from 'assert';
import { LoadQueueMessagesUseCase } from '../../../../features/queueMessages/application/LoadQueueMessagesUseCase';
import { MessageGridColumnsService } from '../../../../features/queueMessages/application/MessageGridColumnsService';
import type { MessageGridColumnsRepository } from '../../../../features/queueMessages/ports/MessageGridColumnsRepository';
import type { MessageOperations } from '../../../../features/queueMessages/ports/MessageOperations';
import type { QueueMessage } from '../../../../features/queueMessages/application/MessageOperationsTypes';

describe('LoadQueueMessagesUseCase', () => {
    it('loads first page from sequence number 1 and maps messages to view data', async () => {
        const operations = new FakeMessageOperations([
            {
                body: Buffer.from('{"hello":"world"}'),
                messageId: 'message-1',
                properties: { traceId: 't-1' },
                enqueuedTime: '2026-02-16T00:00:00Z',
                deliveryCount: 2,
                sequenceNumber: '5'
            }
        ]);
        const service = new LoadQueueMessagesUseCase(
            operations,
            new MessageGridColumnsService(new InMemoryColumnsRepository(['traceId']))
        );

        const page = await service.loadInitial({
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test',
            pageSize: 50
        });

        assert.deepStrictEqual(operations.peekCalls[0], {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test',
            maxMessages: 50,
            fromSequenceNumber: '1'
        });
        assert.strictEqual(page.headers[0], 'Sequence #');
        assert.strictEqual(page.rows.length, 1);
        assert.strictEqual(page.messages[0].sequenceNumber, '5');
        assert.strictEqual(page.messages[0].body, '{\n  "hello": "world"\n}');
        assert.deepStrictEqual(page.messages[0].rawBody, { hello: 'world' });
        assert.strictEqual(page.hasMore, false);
    });

    it('loads next page from incremented sequence number', async () => {
        const operations = new FakeMessageOperations([]);
        const service = new LoadQueueMessagesUseCase(
            operations,
            new MessageGridColumnsService(new InMemoryColumnsRepository([]))
        );

        await service.loadMore({
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test',
            pageSize: 20,
            fromSequenceNumber: '100'
        });

        assert.deepStrictEqual(operations.peekCalls[0], {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test',
            maxMessages: 20,
            fromSequenceNumber: '101'
        });
    });

    it('returns empty page when next sequence number cannot be resolved', async () => {
        const operations = new FakeMessageOperations([]);
        const service = new LoadQueueMessagesUseCase(
            operations,
            new MessageGridColumnsService(new InMemoryColumnsRepository([]))
        );

        const page = await service.loadMore({
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test',
            pageSize: 20,
            fromSequenceNumber: 'abc'
        });

        assert.strictEqual(operations.peekCalls.length, 0);
        assert.deepStrictEqual(page, {
            headers: [],
            rows: [],
            messages: [],
            hasMore: false
        });
    });
});

class FakeMessageOperations implements MessageOperations {
    public readonly peekCalls: Array<{
        queueName: string;
        connectionString: string;
        maxMessages: number;
        fromSequenceNumber: string | undefined;
    }> = [];

    constructor(private readonly peekResult: QueueMessage[]) {}

    async sendMessage(): Promise<void> {}

    async deleteMessage(): Promise<void> {}

    async peekMessages(
        queueName: string,
        connectionString: string,
        maxMessages: number,
        options?: { fromSequenceNumber?: string }
    ): Promise<QueueMessage[]> {
        this.peekCalls.push({
            queueName,
            connectionString,
            maxMessages,
            fromSequenceNumber: options?.fromSequenceNumber
        });
        return this.peekResult;
    }

    async purgeQueue(): Promise<number> {
        return 0;
    }
}

class InMemoryColumnsRepository implements MessageGridColumnsRepository {
    constructor(private readonly columns: string[]) {}

    async getPropertyColumns(): Promise<unknown> {
        return this.columns;
    }

    async setPropertyColumns(): Promise<void> {}
}
