import type { QueueReference } from './OpenQueueMessages';

export interface QueueMessagesPanelGateway {
    open(queue: QueueReference, connectionString: string): Promise<void>;
}
