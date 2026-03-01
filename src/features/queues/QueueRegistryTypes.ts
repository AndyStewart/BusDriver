import type { Connection } from '../common/Connection';

export type QueueRegistryConnection = Connection;

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}
