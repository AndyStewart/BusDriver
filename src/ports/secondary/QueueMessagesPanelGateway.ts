import type { QueueReference } from '../primary/OpenQueueMessages';

export interface QueueMessagesPanelGateway {
    open(queue: QueueReference, connectionString: string): Promise<void>;
}
