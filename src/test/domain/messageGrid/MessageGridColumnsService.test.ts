import * as assert from 'assert';
import { MessageGridColumnsService } from '../../../domain/messageGrid/MessageGridColumnsService';
import type { MessageGridColumnsRepository } from '../../../ports/secondary/MessageGridColumnsRepository';

class FakeMessageGridColumnsRepository implements MessageGridColumnsRepository {
    constructor(public stored: unknown) {}

    async getPropertyColumns(): Promise<unknown> {
        return this.stored;
    }

    async setPropertyColumns(columns: string[]): Promise<void> {
        this.stored = columns;
    }
}

describe('MessageGridColumnsService', () => {
    it('normalizes repository columns when reading', async () => {
        const repository = new FakeMessageGridColumnsRepository([' traceId ', 'Properties.tenant ', '']);
        const service = new MessageGridColumnsService(repository);

        const columns = await service.getPropertyColumns();

        assert.deepStrictEqual(columns, ['traceId', 'tenant']);
    });

    it('normalizes and persists columns from input', async () => {
        const repository = new FakeMessageGridColumnsRepository([]);
        const service = new MessageGridColumnsService(repository);

        const columns = await service.updatePropertyColumnsFromInput(' traceId, properties.correlationId, ');

        assert.deepStrictEqual(columns, ['traceId', 'correlationId']);
        assert.deepStrictEqual(repository.stored, ['traceId', 'correlationId']);
    });

    it('builds rows with built-in fields and property cells', async () => {
        const repository = new FakeMessageGridColumnsRepository(['traceId']);
        const service = new MessageGridColumnsService(repository);

        const view = await service.buildMessageGridView([
            {
                sequenceNumber: 7,
                messageId: 'm-7',
                enqueuedTime: '2026-02-16T00:00:00.000Z',
                deliveryCount: 2,
                properties: { traceId: 'abc' }
            }
        ]);

        assert.deepStrictEqual(view.headers, [
            'Sequence #',
            'Message ID',
            'Enqueued Time',
            'Delivery Count',
            'traceId'
        ]);
        assert.deepStrictEqual(view.rows, [[
            '7',
            'm-7',
            '2026-02-16T00:00:00.000Z',
            '2',
            'abc'
        ]]);
    });
});
