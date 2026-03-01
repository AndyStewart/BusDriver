import type { Connection } from '../common/Connection';
import type { ConnectionLookup } from '../../ports/secondary/ConnectionLookup';
import type { QueueRegistry } from '../../ports/secondary/QueueRegistry';
import type { QueueInfo } from './QueueRegistryTypes';

export interface QueueWithConnection {
    queue: QueueInfo;
    connection: Connection;
}

export class QueueRegistryService {
    constructor(
        private readonly queueRegistry: QueueRegistry,
        private readonly connectionLookup: ConnectionLookup
    ) {}

    async listQueuesForConnection(connection: Connection): Promise<QueueInfo[]> {
        if (!connection.connectionString) {
            throw new Error('Connection string not found');
        }

        return this.queueRegistry.listQueues(connection);
    }

    async listAllQueues(): Promise<QueueWithConnection[]> {
        const connections = await this.connectionLookup.getAll();
        const allQueues: QueueWithConnection[] = [];

        for (const connection of connections) {
            if (!connection.connectionString) {
                continue;
            }

            const queues = await this.queueRegistry.listQueues(connection);
            for (const queue of queues) {
                allQueues.push({ queue, connection });
            }
        }

        return allQueues;
    }
}
