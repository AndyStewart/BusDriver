export interface QueueInfo {
    name: string;
    connectionId: string;
    activeMessageCount: number;
}

export interface QueueRegistryConnection {
    id: string;
    connectionString: string;
}

export interface QueueRegistry {
    listQueues(connection: QueueRegistryConnection): Promise<QueueInfo[]>;
}
