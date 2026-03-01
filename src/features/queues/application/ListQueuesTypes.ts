export interface QueueSelection {
    queue: {
        name: string;
        connectionId: string;
    };
    connection: {
        id: string;
        name: string;
    };
}
