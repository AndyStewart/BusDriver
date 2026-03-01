import type {
    MessageOperationResult,
    MessageWithSource
} from '../../features/queueMessageContracts/MessageOperationTypes';
import type { DeleteMessagesRequest } from '../../features/deleteMessages/DeleteMessagesTypes';

export interface DeleteMessages {
    delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
