import type {
    MessageOperationResult,
    MessageWithSource
} from '../application/MessageOperationTypes';
import type { DeleteMessagesRequest } from '../application/DeleteMessagesTypes';

export interface DeleteMessages {
    delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
