import type * as vscode from 'vscode';
import type { LoadQueueMessages } from '../ports/LoadQueueMessages';
import type { QueueMessagesPanelGateway } from '../ports/QueueMessagesPanelGateway';
import type { QueueReference } from '../application/OpenQueueMessagesTypes';
import { QueueMessagesPanel } from './WebviewQueueMessagesPanelAdapter';

export class VsCodeQueueMessagesPanelGateway implements QueueMessagesPanelGateway {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly loadQueueMessages: LoadQueueMessages
    ) {}

    async open(queue: QueueReference, connectionString: string): Promise<void> {
        await QueueMessagesPanel.createOrShow(
            this.extensionUri,
            {
                name: queue.name,
                connectionId: queue.connectionId
            },
            connectionString,
            this.loadQueueMessages
        );
    }
}
