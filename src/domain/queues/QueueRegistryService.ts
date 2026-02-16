import type { Connection } from '../models/Connection';
import type { ConnectionRepository } from '../../ports/secondary/ConnectionRepository';
import type { QueueInfo, QueueRegistry } from '../../ports/secondary/QueueRegistry';

export interface QueueWithConnection {
    queue: QueueInfo;
    connection: Connection;
}

export class QueueRegistryService {
    constructor(
        private readonly queueRegistry: QueueRegistry,
        private readonly connectionRepository: ConnectionRepository
    ) {}

    async listQueuesForConnection(connection: Connection): Promise<QueueInfo[]> {
        if (!connection.connectionString) {
            throw new Error('Connection string not found');
        }

        return this.queueRegistry.listQueues(connection);
    }

    async listAllQueues(): Promise<QueueWithConnection[]> {
        const connections = await this.connectionRepository.getAll();
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
