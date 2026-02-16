export interface DroppedMessage {
    sequenceNumber: string;
    messageId: string;
    body: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
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
