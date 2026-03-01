import type {
    LoadQueueMessages,
} from '../../ports/primary/LoadQueueMessages';
import type {
    LoadMoreQueueMessagesRequest,
    LoadQueueMessagesRequest,
    QueueMessagesPage,
    QueueMessageView
} from './LoadQueueMessagesTypes';
import type { MessageOperations } from '../../ports/secondary/MessageOperations';
import type { QueueMessage } from '../queueMessageContracts/MessageOperationsTypes';
import type { MessageGridMessage, MessageGridColumnsService } from '../messageGrid/MessageGridColumnsService';

export class LoadQueueMessagesUseCase implements LoadQueueMessages {
    constructor(
        private readonly messageOperations: MessageOperations,
        private readonly messageGridColumnsService: MessageGridColumnsService
    ) {}

    async loadInitial(request: LoadQueueMessagesRequest): Promise<QueueMessagesPage> {
        const messages = await this.peek(request, '1');
        return this.toPage(messages, request.pageSize);
    }

    async loadMore(request: LoadMoreQueueMessagesRequest): Promise<QueueMessagesPage> {
        const nextSequenceNumber = getNextSequenceNumber(request.fromSequenceNumber);
        if (!nextSequenceNumber) {
            return buildEmptyPage();
        }

        const messages = await this.peek(request, nextSequenceNumber);
        return this.toPage(messages, request.pageSize);
    }

    private async peek(request: LoadQueueMessagesRequest, fromSequenceNumber: string): Promise<QueueMessage[]> {
        return this.messageOperations.peekMessages(
            request.queueName,
            request.connectionString,
            request.pageSize,
            { fromSequenceNumber }
        );
    }

    private async toPage(messages: QueueMessage[], pageSize: number): Promise<QueueMessagesPage> {
        const viewModel = await this.messageGridColumnsService.buildMessageGridView(
            messages.map(message => toGridMessage(message))
        );
        const formattedMessages = messages.map(message => formatMessageForView(message));

        return {
            headers: viewModel.headers,
            rows: viewModel.rows,
            messages: formattedMessages,
            hasMore: formattedMessages.length === pageSize
        };
    }
}

function toGridMessage(message: QueueMessage): MessageGridMessage {
    return {
        sequenceNumber: message.sequenceNumber,
        messageId: message.messageId,
        enqueuedTime: message.enqueuedTime,
        deliveryCount: message.deliveryCount,
        properties: message.properties
    };
}

function formatMessageForView(message: QueueMessage): QueueMessageView {
    const { displayBody, rawBody } = formatMessageBody(message);

    return {
        sequenceNumber: message.sequenceNumber?.toString() || 'N/A',
        messageId: message.messageId?.toString() || 'N/A',
        enqueuedTime: message.enqueuedTime || 'N/A',
        deliveryCount: message.deliveryCount ?? 0,
        body: displayBody,
        rawBody,
        properties: message.properties || {}
    };
}

function formatMessageBody(message: QueueMessage): { displayBody: string; rawBody: unknown } {
    if (typeof message.body === 'string') {
        return {
            displayBody: message.body,
            rawBody: message.body
        };
    }

    if (Buffer.isBuffer(message.body)) {
        const textBody = message.body.toString();
        try {
            const parsed = parseJsonValue(textBody.trim());
            return {
                displayBody: JSON.stringify(parsed, null, 2),
                rawBody: parsed
            };
        } catch {
            return {
                displayBody: textBody,
                rawBody: textBody
            };
        }
    }

    return {
        displayBody: JSON.stringify(message.body, null, 2),
        rawBody: message.body
    };
}

function parseJsonValue(value: string): unknown {
    return JSON.parse(value) as unknown;
}

function getNextSequenceNumber(sequenceNumber?: string): string | undefined {
    if (!sequenceNumber) {
        return undefined;
    }

    if (!/^\d+$/.test(sequenceNumber)) {
        return undefined;
    }

    try {
        return (BigInt(sequenceNumber) + 1n).toString();
    } catch {
        return undefined;
    }
}

function buildEmptyPage(): QueueMessagesPage {
    return {
        headers: [],
        rows: [],
        messages: [],
        hasMore: false
    };
}
