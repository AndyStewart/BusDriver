import type { MoveMessages, MoveMessagesRequest } from '../ports/MoveMessages';
import { MessageMover } from './MessageMover';
import type { MessageOperationResult, MessageWithSource } from './MessageTypes';

export class MoveMessagesUseCase implements MoveMessages {
    constructor(private readonly messageMover: MessageMover) {}

    async move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>> {
        return this.messageMover.moveMessages(
            request.targetQueueName,
            request.targetConnectionString,
            request.messages,
            request.onProgress
        );
    }
}
