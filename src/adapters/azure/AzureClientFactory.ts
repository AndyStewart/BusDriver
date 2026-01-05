import type {
    ReceiverLike,
    SenderLike,
    ServiceBusClientFactory,
    ServiceBusClientLike
} from './AzureMessageOperations';

interface ClientEntry {
    client: ServiceBusClientLike;
    senders: Map<string, SenderLike>;
    receivers: Map<string, ReceiverLike>;
    disposed: boolean;
}

export class AzureClientFactory {
    private readonly clients = new Map<string, ClientEntry>();
    private disposed = false;

    constructor(private readonly createClient: ServiceBusClientFactory) {}

    getSender(connectionString: string, queueName: string): SenderLike {
        const entry = this.getEntry(connectionString);
        const existing = entry.senders.get(queueName);
        if (existing) {
            return existing;
        }

        const sender = entry.client.createSender(queueName);
        entry.senders.set(queueName, sender);
        return sender;
    }

    getReceiver(connectionString: string, queueName: string): ReceiverLike {
        const entry = this.getEntry(connectionString);
        const existing = entry.receivers.get(queueName);
        if (existing) {
            return existing;
        }

        const receiver = entry.client.createReceiver(queueName);
        entry.receivers.set(queueName, receiver);
        return receiver;
    }

    async releaseQueueResources(connectionString: string, queueName: string): Promise<void> {
        const entry = this.clients.get(connectionString);
        if (!entry || entry.disposed) {
            return;
        }

        const sender = entry.senders.get(queueName);
        if (sender) {
            await sender.close();
            entry.senders.delete(queueName);
        }

        const receiver = entry.receivers.get(queueName);
        if (receiver) {
            await receiver.close();
            entry.receivers.delete(queueName);
        }
    }

    async disposeConnection(connectionString: string): Promise<void> {
        const entry = this.clients.get(connectionString);
        if (!entry) {
            return;
        }

        entry.disposed = true;
        await this.closeEntry(entry);
        this.clients.delete(connectionString);
    }

    async disposeAll(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        const entries = Array.from(this.clients.values());
        this.clients.clear();

        for (const entry of entries) {
            entry.disposed = true;
            await this.closeEntry(entry);
        }
    }

    private getEntry(connectionString: string): ClientEntry {
        if (this.disposed) {
            throw new Error('Azure client factory is disposed');
        }

        const existing = this.clients.get(connectionString);
        if (existing) {
            if (existing.disposed) {
                throw new Error('Service Bus client has been disposed');
            }
            return existing;
        }

        const entry: ClientEntry = {
            client: this.createClient(connectionString),
            senders: new Map(),
            receivers: new Map(),
            disposed: false
        };
        this.clients.set(connectionString, entry);
        return entry;
    }

    private async closeEntry(entry: ClientEntry): Promise<void> {
        for (const sender of entry.senders.values()) {
            await sender.close();
        }
        entry.senders.clear();

        for (const receiver of entry.receivers.values()) {
            await receiver.close();
        }
        entry.receivers.clear();

        await entry.client.close();
    }
}
