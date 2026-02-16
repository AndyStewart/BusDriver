import type { Connection } from '../../domain/models/Connection';

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}

export interface QueueRegistry {
    listQueues(connection: Connection): Promise<QueueInfo[]>;
}
