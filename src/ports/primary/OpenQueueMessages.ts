import type { QueueReference } from '../../features/queueMessages/OpenQueueMessagesTypes';

export interface OpenQueueMessages {
    open(queue: QueueReference): Promise<void>;
}
