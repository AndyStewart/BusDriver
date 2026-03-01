import type {
    MessageOperationResult,
    MessageWithSource
} from '../../features/queueMessages/MessageOperationTypes';
import type { DeleteMessagesRequest } from '../../features/queueMessages/DeleteMessagesTypes';

export interface DeleteMessages {
    delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
