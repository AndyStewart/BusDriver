import type {
    MessageOperationResult,
    MessageWithSource
} from '../../features/queueMessageContracts/MessageOperationTypes';
import type { MoveMessagesRequest } from '../../features/moveMessages/MoveMessagesTypes';

export interface MoveMessages {
    move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
