import type { Connection } from '../../connections/application/Connection';

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}

export interface QueueRegistry {
    listQueues(connection: Connection): Promise<QueueInfo[]>;
}
