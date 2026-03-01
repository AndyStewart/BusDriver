import type { Connection } from '../../../shared/ports/Connection';

export type QueueRegistryConnection = Connection;

export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}
