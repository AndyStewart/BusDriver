import { MessageDeleter } from '../../domain/messages/MessageDeleter';
import type { MessageOperationResult, MessageWithSource } from '../../domain/messages/MessageTypes';
import type { DeleteMessages, DeleteMessagesRequest } from '../../ports/primary/DeleteMessages';

export class DeleteMessagesUseCase implements DeleteMessages {
    constructor(private readonly messageDeleter: MessageDeleter) {}

    async delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>> {
        return this.messageDeleter.deleteMessages(request.messages, request.onProgress);
    }
}
