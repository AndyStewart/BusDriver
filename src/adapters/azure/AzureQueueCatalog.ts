import { ServiceBusAdministrationClient } from '@azure/service-bus';
import type { Connection } from '../../models/Connection';
import type { QueueCatalog, QueueInfo } from '../../ports/QueueCatalog';

export interface AdminQueueClient {
    listQueues(): AsyncIterable<{ name: string }>;
    getQueueRuntimeProperties(queueName: string): Promise<{ activeMessageCount: number }>;
}

export type AdminClientFactory = (connectionString: string) => AdminQueueClient;

export class AzureQueueCatalog implements QueueCatalog {
    constructor(private readonly adminClientFactory: AdminClientFactory = (connectionString) => {
        return new ServiceBusAdministrationClient(connectionString);
    }) {}

    async listQueues(connection: Connection): Promise<QueueInfo[]> {
        const adminClient = this.adminClientFactory(connection.connectionString);
        const queues: QueueInfo[] = [];

        for await (const queueProperties of adminClient.listQueues()) {
            const stats = await adminClient.getQueueRuntimeProperties(queueProperties.name);
            queues.push({
                name: queueProperties.name,
                connectionId: connection.id,
                activeMessageCount: stats.activeMessageCount
            });
        }

        return queues;
    }
}
