import type { MessageOperationResult } from '../domain/messages/MessageTypes';

export interface OperationSummary {
    level: 'info' | 'warning' | 'error';
    message: string;
}

export function summarizeMoveResult(
    queueName: string,
    messageCount: number,
    results: MessageOperationResult<{ messageId: string }>
): OperationSummary {
    const isMultiple = messageCount > 1;

    if (results.failed.length === 0) {
        return {
            level: 'info',
            message: isMultiple
                ? `Successfully moved ${messageCount} messages to ${queueName}`
                : `Message moved to ${queueName}`
        };
    }

    if (results.successful.length === 0) {
        const failedIds = results.failed.map(f => f.message.messageId).join(', ');
        return {
            level: 'error',
            message: `Failed to move ${messageCount} message(s) to ${queueName}. IDs: ${failedIds}`
        };
    }

    const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
    return {
        level: 'warning',
        message: `Moved ${results.successful.length} of ${messageCount} messages to ${queueName}. Failed: ${failedIds}`
    };
}

export function summarizeDeleteResult(
    queueName: string,
    messageCount: number,
    results: MessageOperationResult<{ messageId: string }>
): OperationSummary {
    if (results.failed.length === 0) {
        return {
            level: 'info',
            message: messageCount > 1
                ? `Successfully deleted ${messageCount} messages from ${queueName}`
                : `Message deleted from ${queueName}`
        };
    }

    if (results.successful.length === 0) {
        const failedIds = results.failed.map(f => f.message.messageId).join(', ');
        return {
            level: 'error',
            message: `Failed to delete ${messageCount} message(s) from ${queueName}. IDs: ${failedIds}`
        };
    }

    const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
    return {
        level: 'warning',
        message: `Deleted ${results.successful.length} of ${messageCount} messages from ${queueName}. Failed: ${failedIds}`
    };
}
