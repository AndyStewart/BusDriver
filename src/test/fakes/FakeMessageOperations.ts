import type { MessageOperations, QueueMessage } from '../../ports/MessageOperations';

export class FakeMessageOperations implements MessageOperations {
    sent: Array<{ queueName: string; connectionString: string; message: QueueMessage }> = [];
    deleted: Array<{ queueName: string; connectionString: string; sequenceNumber: string }> = [];
    sendFailures = new Set<string>();
    deleteFailures = new Set<string>();

    async sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void> {
        if (this.sendFailures.has(message.messageId)) {
            throw new Error(`send failed: ${message.messageId}`);
        }

        this.sent.push({ queueName, connectionString, message });
    }

    async deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void> {
        if (this.deleteFailures.has(sequenceNumber)) {
            throw new Error(`delete failed: ${sequenceNumber}`);
        }

        this.deleted.push({ queueName, connectionString, sequenceNumber });
    }

    async peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]> {
        void queueName;
        void connectionString;
        void maxMessages;
        return [];
    }
}
