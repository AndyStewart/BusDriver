import type { ConnectionLookup } from '../../ports/secondary/ConnectionLookup';
import type { OpenQueueMessages } from '../../ports/primary/OpenQueueMessages';
import type { QueueMessagesPanelGateway } from '../../ports/secondary/QueueMessagesPanelGateway';
import type { QueueReference } from './OpenQueueMessagesTypes';

export class OpenQueueMessagesUseCase implements OpenQueueMessages {
    constructor(
        private readonly connectionLookup: ConnectionLookup,
        private readonly panelGateway: QueueMessagesPanelGateway
    ) {}

    async open(queue: QueueReference): Promise<void> {
        const connection = await this.connectionLookup.getById(queue.connectionId);
        const connectionString = connection?.connectionString?.trim();

        if (!connectionString) {
            throw new Error('Connection string not found');
        }

        await this.panelGateway.open(queue, connectionString);
    }
}
