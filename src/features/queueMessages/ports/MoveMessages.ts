import type {
    MessageOperationResult,
    MessageWithSource
} from '../application/MessageOperationTypes';
import type { MoveMessagesRequest } from '../application/MoveMessagesTypes';

export interface MoveMessages {
    move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
