import type { PurgeQueue } from '../../ports/primary/PurgeQueue';
import type { MessageOperations } from '../../ports/secondary/MessageOperations';
import type { PurgeQueueRequest } from './PurgeQueueTypes';

export class PurgeQueueUseCase implements PurgeQueue {
    constructor(private readonly messageOperations: MessageOperations) {}

    async purge(request: PurgeQueueRequest): Promise<number> {
        return this.messageOperations.purgeQueue(request.queueName, request.connectionString);
    }
}
