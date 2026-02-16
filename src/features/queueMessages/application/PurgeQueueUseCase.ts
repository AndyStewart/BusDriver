import type { PurgeQueue, PurgeQueueRequest } from '../ports/PurgeQueue';
import type { MessageOperations } from '../ports/MessageOperations';

export class PurgeQueueUseCase implements PurgeQueue {
    constructor(private readonly messageOperations: MessageOperations) {}

    async purge(request: PurgeQueueRequest): Promise<number> {
        return this.messageOperations.purgeQueue(request.queueName, request.connectionString);
    }
}
