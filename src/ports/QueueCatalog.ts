import type { Connection } from '../models/Connection';

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}

export interface QueueCatalog {
    listQueues(connection: Connection): Promise<QueueInfo[]>;
}
