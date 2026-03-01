import type { QueueReference } from '../application/OpenQueueMessagesTypes';

export interface QueueMessagesPanelGateway {
    open(queue: QueueReference, connectionString: string): Promise<void>;
}
