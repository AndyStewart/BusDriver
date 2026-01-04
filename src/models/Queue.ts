import * as vscode from 'vscode';

export interface Queue {
    name: string;
    connectionId: string;
}

export interface QueueStats {
    activeMessageCount: number;
}

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
