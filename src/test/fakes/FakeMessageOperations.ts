import type {
    DeleteMessagesResult,
    MessageOperations,
    QueueMessage
} from '../../ports/MessageOperations';

export class FakeMessageOperations implements MessageOperations {
    sent: Array<{ queueName: string; connectionString: string; message: QueueMessage }> = [];
    deleted: Array<{ queueName: string; connectionString: string; sequenceNumber: string }> = [];
    released: Array<{ queueName: string; connectionString: string }> = [];
    disposed = false;
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

    async deleteMessages(
        queueName: string,
        connectionString: string,
        sequenceNumbers: string[]
    ): Promise<DeleteMessagesResult> {
        const deletedSequenceNumbers: string[] = [];
        const notFoundSequenceNumbers: string[] = [];

        for (const sequenceNumber of sequenceNumbers) {
            if (this.deleteFailures.has(sequenceNumber)) {
                notFoundSequenceNumbers.push(sequenceNumber);
                continue;
            }

            this.deleted.push({ queueName, connectionString, sequenceNumber });
            deletedSequenceNumbers.push(sequenceNumber);
        }

        return {
            deletedSequenceNumbers,
            notFoundSequenceNumbers,
            failureReason: notFoundSequenceNumbers.length > 0 ? 'Message(s) not found in queue' : undefined
        };
    }

    async peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]> {
        void queueName;
        void connectionString;
        void maxMessages;
        return [];
    }

    async releaseQueueResources(queueName: string, connectionString: string): Promise<void> {
        this.released.push({ queueName, connectionString });
    }

    async dispose(): Promise<void> {
        this.disposed = true;
    }
}
