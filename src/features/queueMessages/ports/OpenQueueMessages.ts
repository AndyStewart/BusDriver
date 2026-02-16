export interface QueueReference {
    name: string;
    connectionId: string;
}

export interface OpenQueueMessages {
    open(queue: QueueReference): Promise<void>;
}
