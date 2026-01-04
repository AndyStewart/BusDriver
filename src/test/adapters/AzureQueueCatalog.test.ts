import * as assert from 'assert';
import { AzureQueueCatalog, AdminQueueClient } from '../../adapters/azure/AzureQueueCatalog';
import type { Connection } from '../../models/Connection';

const createAsyncIterator = (names: string[]): AsyncIterable<{ name: string }> => {
    async function* iterator() {
        for (const name of names) {
            yield { name };
        }
    }

    return iterator();
};

describe('AzureQueueCatalog', () => {
    it('maps queues to summaries with stats', async () => {
        const fakeClient: AdminQueueClient = {
            listQueues: () => createAsyncIterator(['alpha', 'beta']),
            getQueueRuntimeProperties: async (queueName: string) => {
                return { activeMessageCount: queueName === 'alpha' ? 3 : 7 };
            }
        };
        const catalog = new AzureQueueCatalog(() => fakeClient);
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };

        const result = await catalog.listQueues(connection);

        assert.deepStrictEqual(result, [
            { name: 'alpha', connectionId: 'conn-1', activeMessageCount: 3 },
            { name: 'beta', connectionId: 'conn-1', activeMessageCount: 7 }
        ]);
    });
});
