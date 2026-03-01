import type { Queue } from '../../../shared/application/Queue';

export interface DroppedMessage {
    sequenceNumber: string;
    messageId: string;
    body: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
}

export interface QueueMessageData {
    sequenceNumber: string;
    messageId: string;
    body: string;
    rawBody: unknown;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sourceQueue?: Queue;
    sourceConnectionString?: string;
}

export type MoveMessageData = QueueMessageData | DroppedMessage;

export interface MessageSource {
    queueName: string;
    connectionString: string;
}

export interface MessageWithSource {
    sequenceNumber: string;
    messageId: string;
    body: unknown;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    source?: MessageSource;
}

export interface MessageOperationFailure<T> {
    message: T;
    error: string;
}

export interface MessageOperationResult<T> {
    successful: T[];
    failed: Array<MessageOperationFailure<T>>;
}

export interface MoveMessagesRequest {
    targetQueueName: string;
    targetConnectionString: string;
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}

export interface MoveMessagesPort {
    move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}

export interface OperationSummary {
    level: 'info' | 'warning' | 'error';
    message: string;
}

export function parseDroppedMessages(
    textUriValue: string | undefined,
    textPlainValue: string | undefined
): DroppedMessage[] | undefined {
    const fromUri = parseUriPayload(textUriValue);
    if (fromUri) {
        return fromUri;
    }

    return parseJsonPayload(textPlainValue);
}

export function selectDropMessages(
    pendingDragMessage: QueueMessageData | QueueMessageData[] | undefined,
    parsedMessages: DroppedMessage[] | undefined
): MoveMessageData[] | undefined {
    if (pendingDragMessage) {
        return Array.isArray(pendingDragMessage) ? pendingDragMessage : [pendingDragMessage];
    }

    return parsedMessages;
}

export function mapMoveMessageToDomain(messageData: MoveMessageData): MessageWithSource {
    const source = extractSource(messageData);
    const body = 'rawBody' in messageData ? messageData.rawBody : messageData.body;

    return {
        body,
        messageId: messageData.messageId,
        properties: messageData.properties,
        enqueuedTime: messageData.enqueuedTime,
        deliveryCount: messageData.deliveryCount,
        sequenceNumber: messageData.sequenceNumber,
        source
    };
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

function parseUriPayload(textUriValue: string | undefined): DroppedMessage[] | undefined {
    if (!textUriValue || !textUriValue.startsWith('busdriver-message:')) {
        return undefined;
    }

    try {
        const raw = decodeURIComponent(textUriValue.substring('busdriver-message:'.length));
        return parseJsonPayload(raw);
    } catch {
        return undefined;
    }
}

function parseJsonPayload(raw: string | undefined): DroppedMessage[] | undefined {
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const messages = list.filter(isDroppedMessage);
        return messages.length > 0 ? messages : undefined;
    } catch {
        return undefined;
    }
}

function isDroppedMessage(value: unknown): value is DroppedMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.sequenceNumber === 'string'
        && typeof candidate.messageId === 'string'
        && typeof candidate.body === 'string'
        && typeof candidate.enqueuedTime === 'string'
        && typeof candidate.deliveryCount === 'number'
        && isRecord(candidate.properties);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractSource(messageData: MoveMessageData): MessageSource | undefined {
    if (!isQueueMessageData(messageData)) {
        return undefined;
    }

    const { sourceQueue, sourceConnectionString } = messageData;
    if (!sourceQueue || typeof sourceConnectionString !== 'string' || sourceConnectionString.length === 0) {
        return undefined;
    }

    return {
        queueName: sourceQueue.name,
        connectionString: sourceConnectionString
    };
}

function isQueueMessageData(messageData: MoveMessageData): messageData is QueueMessageData {
    return 'sourceQueue' in messageData || 'rawBody' in messageData;
}
