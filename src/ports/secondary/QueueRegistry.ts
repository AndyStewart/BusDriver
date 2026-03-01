import type {
    QueueInfo,
    QueueRegistryConnection
} from '../../features/queues/QueueRegistryTypes';

export interface QueueRegistry {
    listQueues(connection: QueueRegistryConnection): Promise<QueueInfo[]>;
}
