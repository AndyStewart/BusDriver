import type { MessageOperations, QueueMessage } from '../../ports/secondary/MessageOperations';

export class MessageSender {
    constructor(private readonly messageOperations: MessageOperations) {}

    async send(queueName: string, connectionString: string, message: QueueMessage): Promise<void> {
        await this.messageOperations.sendMessage(queueName, connectionString, message);
    }
}
