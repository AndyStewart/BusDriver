import type { MoveMessages, MoveMessagesRequest } from '../../ports/primary/MoveMessages';
import { MessageMover } from '../../domain/messages/MessageMover';
import type { MessageOperationResult, MessageWithSource } from '../../domain/messages/MessageTypes';

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
