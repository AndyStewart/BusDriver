import type {
    QueueInfo,
    QueueRegistryConnection
} from '../application/QueueRegistryTypes';

export interface QueueRegistry {
    listQueues(connection: QueueRegistryConnection): Promise<QueueInfo[]>;
}
