import type { QueueSelection } from '../../features/queues/ListQueuesTypes';

export interface ListQueues {
    list(): Promise<QueueSelection[]>;
}
