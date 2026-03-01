import type {
    MessageOperationResult,
    MessageWithSource
} from '../../features/queueMessages/MessageOperationTypes';
import type { MoveMessagesRequest } from '../../features/queueMessages/MoveMessagesTypes';

export interface MoveMessages {
    move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
