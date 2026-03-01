import type { MessageSource, MessageWithSource } from '../../features/queueMessages/MessageTypes';
import type { DroppedMessage } from './TreeDropMessageParserAdapter';
import type { QueueMessage as QueueMessageData } from './WebviewQueueMessagesPanelAdapter';

export type MoveMessageData = QueueMessageData | DroppedMessage;

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
