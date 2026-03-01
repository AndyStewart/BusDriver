import type { QueueReference } from '../application/OpenQueueMessagesTypes';

export interface OpenQueueMessages {
    open(queue: QueueReference): Promise<void>;
}
