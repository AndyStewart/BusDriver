import type { MessageGridColumnsRepository } from '../../ports/MessageGridColumnsRepository';
import {
    buildMessageGridHeaders,
    buildPropertyRowCells,
    normalizePropertyColumns
} from './messageGridColumns';

export interface MessageGridMessage {
    sequenceNumber?: string | number;
    messageId?: string | number;
    enqueuedTime?: string;
    deliveryCount?: number;
    properties?: Record<string, unknown>;
}

export interface MessageGridViewModel {
    headers: string[];
    rows: string[][];
}

export class MessageGridColumnsService {
    constructor(private readonly repository: MessageGridColumnsRepository) {}

    async getPropertyColumns(): Promise<string[]> {
        const stored = await this.repository.getPropertyColumns();
        return normalizePropertyColumns(stored);
    }

    async updatePropertyColumnsFromInput(input: string): Promise<string[]> {
        const normalized = normalizePropertyColumns(input);
        await this.repository.setPropertyColumns(normalized);
        return normalized;
    }

    async buildMessageGridView(messages: MessageGridMessage[]): Promise<MessageGridViewModel> {
        const propertyColumns = await this.getPropertyColumns();
        const headers = buildMessageGridHeaders(propertyColumns);
        const rows = messages.map(message => {
            const builtInCells = [
                message.sequenceNumber?.toString() || 'N/A',
                message.messageId?.toString() || 'N/A',
                message.enqueuedTime || 'N/A',
                (message.deliveryCount ?? 0).toString()
            ];
            const propertyCells = buildPropertyRowCells(message.properties, propertyColumns);
            return [...builtInCells, ...propertyCells];
        });

        return { headers, rows };
    }
}
