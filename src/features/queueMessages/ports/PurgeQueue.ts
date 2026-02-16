export interface PurgeQueueRequest {
    queueName: string;
    connectionString: string;
}

export interface PurgeQueue {
    purge(request: PurgeQueueRequest): Promise<number>;
}
