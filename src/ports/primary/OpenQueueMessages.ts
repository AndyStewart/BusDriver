import type { QueueReference } from '../../features/openQueueMessages/OpenQueueMessagesTypes';

export interface OpenQueueMessages {
    open(queue: QueueReference): Promise<void>;
}
