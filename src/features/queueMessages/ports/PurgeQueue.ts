import type { PurgeQueueRequest } from '../application/PurgeQueueTypes';

export interface PurgeQueue {
    purge(request: PurgeQueueRequest): Promise<number>;
}
