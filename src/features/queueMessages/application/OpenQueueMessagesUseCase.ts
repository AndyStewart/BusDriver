import { ConnectionService } from '../../connections/application/ConnectionService';
import type { OpenQueueMessages, QueueReference } from '../ports/OpenQueueMessages';
import type { QueueMessagesPanelGateway } from '../ports/QueueMessagesPanelGateway';

export class OpenQueueMessagesUseCase implements OpenQueueMessages {
    constructor(
        private readonly connectionService: ConnectionService,
        private readonly panelGateway: QueueMessagesPanelGateway
    ) {}

    async open(queue: QueueReference): Promise<void> {
        const connection = await this.connectionService.getConnectionById(queue.connectionId);
        const connectionString = connection?.connectionString?.trim();

        if (!connectionString) {
            throw new Error('Connection string not found');
        }

        await this.panelGateway.open(queue, connectionString);
    }
}
