export interface Queue {
    name: string;
    connectionId: string;
}

export interface QueueStats {
    activeMessageCount: number;
}
