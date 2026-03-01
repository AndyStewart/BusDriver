import * as vscode from 'vscode';
import type { Queue, QueueStats } from '../../application/Queue';

export class QueueTreeItem extends vscode.TreeItem {
    constructor(
        public readonly queue: Queue,
        public readonly stats: QueueStats,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(`${queue.name} (${stats.activeMessageCount})`, collapsibleState);

        this.tooltip = `Queue: ${queue.name}`;
        this.contextValue = 'queue';
        this.iconPath = new vscode.ThemeIcon('inbox');
    }
}
