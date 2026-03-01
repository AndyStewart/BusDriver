import type { PurgeQueueRequest } from '../../features/purgeMessages/PurgeQueueTypes';

export interface PurgeQueue {
    purge(request: PurgeQueueRequest): Promise<number>;
}
