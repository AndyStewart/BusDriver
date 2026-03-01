import type { QueueReference } from '../../features/openQueueMessages/OpenQueueMessagesTypes';

export interface QueueMessagesPanelGateway {
    open(queue: QueueReference, connectionString: string): Promise<void>;
}
