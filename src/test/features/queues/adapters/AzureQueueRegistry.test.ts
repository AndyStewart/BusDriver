import * as assert from 'assert';
import { AzureQueueRegistry, AdminQueueClient } from '../../../../features/queues/adapters/AzureQueueRegistryAdapter';
import type { Connection } from '../../../../features/connections/application/Connection';

const createAsyncIterator = (names: string[]): AsyncIterable<{ name: string }> => {
    async function* iterator() {
        for (const name of names) {
            yield { name };
        }
    }

    return iterator();
};

describe('AzureQueueRegistry', () => {
    it('maps queues to summaries with stats', async () => {
        const fakeClient: AdminQueueClient = {
            listQueues: () => createAsyncIterator(['alpha', 'beta']),
            getQueueRuntimeProperties: async (queueName: string) => {
                return { activeMessageCount: queueName === 'alpha' ? 3 : 7 };
            }
        };
        const registry = new AzureQueueRegistry(() => fakeClient);
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };

        const result = await registry.listQueues(connection);

        assert.deepStrictEqual(result, [
            { name: 'alpha', connectionId: 'conn-1', activeMessageCount: 3 },
            { name: 'beta', connectionId: 'conn-1', activeMessageCount: 7 }
        ]);
    });

    it('handles paginated async iterables', async () => {
        const names = ['alpha', 'beta', 'gamma'];
        const fakeClient: AdminQueueClient = {
            listQueues: async function* () {
                yield { name: names[0] };
                await new Promise(resolve => setTimeout(resolve, 0));
                yield { name: names[1] };
                yield { name: names[2] };
            },
            getQueueRuntimeProperties: async () => {
                return { activeMessageCount: 1 };
            }
        };
        const registry = new AzureQueueRegistry(() => fakeClient);
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };

        const result = await registry.listQueues(connection);

        assert.deepStrictEqual(result, [
            { name: 'alpha', connectionId: 'conn-1', activeMessageCount: 1 },
            { name: 'beta', connectionId: 'conn-1', activeMessageCount: 1 },
            { name: 'gamma', connectionId: 'conn-1', activeMessageCount: 1 }
        ]);
    });
});
