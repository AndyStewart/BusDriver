import type { MessageOperations } from '../ports/MessageOperations';
import type { QueueMessage } from './MessageOperationsTypes';

export class MessageSender {
    constructor(private readonly messageOperations: MessageOperations) {}

    async send(queueName: string, connectionString: string, message: QueueMessage): Promise<void> {
        await this.messageOperations.sendMessage(queueName, connectionString, message);
    }
}
