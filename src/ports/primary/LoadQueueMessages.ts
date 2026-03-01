import type {
    LoadMoreQueueMessagesRequest,
    LoadQueueMessagesRequest,
    QueueMessagesPage
} from '../../features/queueMessages/LoadQueueMessagesTypes';

export interface LoadQueueMessages {
    loadInitial(request: LoadQueueMessagesRequest): Promise<QueueMessagesPage>;
    loadMore(request: LoadMoreQueueMessagesRequest): Promise<QueueMessagesPage>;
}
