import type { Connection } from '../../../shared/application/Connection';

export type QueueRegistryConnection = Connection;

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}
