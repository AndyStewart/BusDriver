import { MessageDeleter } from './MessageDeleter';
import type { MessageOperationResult, MessageWithSource } from './MessageTypes';
import type { DeleteMessages, DeleteMessagesRequest } from '../ports/DeleteMessages';

export class DeleteMessagesUseCase implements DeleteMessages {
    constructor(private readonly messageDeleter: MessageDeleter) {}

    async delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>> {
        return this.messageDeleter.deleteMessages(request.messages, request.onProgress);
    }
}
