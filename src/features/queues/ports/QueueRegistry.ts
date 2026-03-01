import type { Connection } from '../../../shared/ports/Connection';

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}

export interface QueueRegistry {
    listQueues(connection: Connection): Promise<QueueInfo[]>;
}
