import type { MessageOperations } from '../../ports/secondary/MessageOperations';
import type { QueueMessage } from '../queueMessageContracts/MessageOperationsTypes';

export class MessageSender {
    constructor(private readonly messageOperations: MessageOperations) {}

    async send(queueName: string, connectionString: string, message: QueueMessage): Promise<void> {
        await this.messageOperations.sendMessage(queueName, connectionString, message);
    }
}
