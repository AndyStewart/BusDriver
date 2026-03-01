import type { QueueReference } from '../../features/queueMessages/OpenQueueMessagesTypes';

export interface QueueMessagesPanelGateway {
    open(queue: QueueReference, connectionString: string): Promise<void>;
}
