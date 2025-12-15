import * as vscode from 'vscode';

export interface Connection {
    id: string;
    name: string;
    connectionString: string;
    createdAt: Date;
}

export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly connection: Connection,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(connection.name, collapsibleState);

        this.tooltip = `${connection.name}\nCreated: ${connection.createdAt.toLocaleString()}`;
        this.contextValue = 'connection';
        this.iconPath = new vscode.ThemeIcon('server-environment');
    }
}
