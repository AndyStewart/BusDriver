import type { PurgeQueueRequest } from '../../features/queueMessages/PurgeQueueTypes';

export interface PurgeQueue {
    purge(request: PurgeQueueRequest): Promise<number>;
}
