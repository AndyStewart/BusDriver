import { Queue } from '../models/Queue';

export interface QueuePanelContextValue {
    queue: Queue;
    connectionString: string;
}

export function resolveQueuePanelContext(
    queue: Queue,
    connectionString: string
): QueuePanelContextValue {
    return {
        queue: {
            name: queue.name,
            connectionId: queue.connectionId
        },
        connectionString
    };
}
