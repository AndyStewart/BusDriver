import type { QueueSelection } from '../application/ListQueuesTypes';

export interface ListQueues {
    list(): Promise<QueueSelection[]>;
}
