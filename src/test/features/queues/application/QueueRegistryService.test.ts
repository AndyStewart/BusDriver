import * as assert from 'assert';
import type { Connection } from '../../../../features/connections/application/Connection';
import { QueueRegistryService } from '../../../../features/queues/application/QueueRegistryService';
import type { QueueRegistry } from '../../../../features/queues/ports/QueueRegistry';
import { InMemoryConnectionRepository } from '../../../shared/fakes/InMemoryConnectionRepository';

describe('QueueRegistryService', () => {
    it('lists queues for a single connection', async () => {
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };
        const registry: QueueRegistry = {
            listQueues: async (target) => {
                return [
                    { name: 'alpha', connectionId: target.id, activeMessageCount: 2 }
                ];
            }
        };
        const repository = new InMemoryConnectionRepository();
        await repository.save(connection);
        const service = new QueueRegistryService(registry, repository);

        const queues = await service.listQueuesForConnection(connection);

        assert.deepStrictEqual(queues, [
            { name: 'alpha', connectionId: 'conn-1', activeMessageCount: 2 }
        ]);
    });

    it('returns empty when no queues are available', async () => {
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };
        const registry: QueueRegistry = {
            listQueues: async () => {
                return [];
            }
        };
        const repository = new InMemoryConnectionRepository();
        await repository.save(connection);
        const service = new QueueRegistryService(registry, repository);

        const queues = await service.listQueuesForConnection(connection);

        assert.deepStrictEqual(queues, []);
    });

    it('lists queues across all connections', async () => {
        const connectionA: Connection = {
            id: 'conn-a',
            name: 'Alpha',
            connectionString: 'Endpoint=sb://alpha/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };
        const connectionB: Connection = {
            id: 'conn-b',
            name: 'Beta',
            connectionString: 'Endpoint=sb://beta/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };
        const registry: QueueRegistry = {
            listQueues: async (target) => {
                return target.id === 'conn-a'
                    ? [{ name: 'q-a', connectionId: target.id, activeMessageCount: 1 }]
                    : [{ name: 'q-b', connectionId: target.id, activeMessageCount: 3 }];
            }
        };
        const repository = new InMemoryConnectionRepository();
        await repository.save(connectionA);
        await repository.save(connectionB);
        const service = new QueueRegistryService(registry, repository);

        const queues = await service.listAllQueues();

        assert.deepStrictEqual(queues, [
            { queue: { name: 'q-a', connectionId: 'conn-a', activeMessageCount: 1 }, connection: connectionA },
            { queue: { name: 'q-b', connectionId: 'conn-b', activeMessageCount: 3 }, connection: connectionB }
        ]);
    });

    it('propagates registry errors', async () => {
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://fake/',
            createdAt: new Date('2024-01-02T03:04:05.000Z')
        };
        const registry: QueueRegistry = {
            listQueues: async () => {
                throw new Error('boom');
            }
        };
        const repository = new InMemoryConnectionRepository();
        await repository.save(connection);
        const service = new QueueRegistryService(registry, repository);

        await assert.rejects(() => service.listAllQueues(), /boom/);
    });
});
