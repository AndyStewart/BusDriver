import type {
    LoadMoreQueueMessagesRequest,
    LoadQueueMessagesRequest,
    QueueMessagesPage
} from '../../features/listMessages/LoadQueueMessagesTypes';

export interface LoadQueueMessages {
    loadInitial(request: LoadQueueMessagesRequest): Promise<QueueMessagesPage>;
    loadMore(request: LoadMoreQueueMessagesRequest): Promise<QueueMessagesPage>;
}
